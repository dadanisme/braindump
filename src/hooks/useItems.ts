import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { extractItems, OpenRouterCallError } from '../lib/openrouter';
import { getUsdToIdrRate } from '../lib/currency';
import { aiUsageKeys } from './useAiUsage';
import type { ResponseLanguage } from '@/hooks/useLanguageSetting';
import type {
  TokenUsage,
  ItemRow,
  ItemWithTopics,
  NoteRow,
  TopicRow,
} from '../lib/types';

async function logAiUsage(args: {
  userId: string;
  noteId: string | null;
  model: string;
  usage: TokenUsage;
  costUsd: number;
  fxRate: number;
  status: 'success' | 'error';
  errorMessage?: string | null;
}) {
  const { error } = await supabase.from('ai_usage').insert({
    user_id: args.userId,
    note_id: args.noteId,
    model_name: args.model,
    input_tokens: args.usage.inputTokens,
    output_tokens: args.usage.outputTokens,
    total_tokens: args.usage.totalTokens,
    cost_usd: args.costUsd,
    fx_rate_idr: args.fxRate,
    status: args.status,
    error_message: args.errorMessage ?? null,
  });
  if (error) {
    console.error('Failed to log AI usage', error);
  }
}

export function itemsKey(userId: string) {
  return ['items', userId] as const;
}

export function noteKey(noteId: string) {
  return ['note', noteId] as const;
}

const PAGE_SIZE = 1000;

async function fetchItems(userId: string): Promise<ItemWithTopics[]> {
  type Row = ItemRow & {
    item_topics: Array<{ topics: TopicRow | null }>;
  };

  const all: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('items')
      .select('*, item_topics(topics(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }

  return all.map(({ item_topics, ...item }) => ({
    ...item,
    topics: item_topics
      .map((it) => it.topics)
      .filter((t): t is TopicRow => t !== null),
  }));
}

export function useItems(userId: string) {
  return useQuery({
    queryKey: itemsKey(userId),
    queryFn: () => fetchItems(userId),
  });
}

export function useUpdateItem(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<ItemRow>;
    }) => {
      const { error } = await supabase
        .from('items')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: itemsKey(userId) });
      const prev = qc.getQueryData<ItemWithTopics[]>(itemsKey(userId));
      if (prev) {
        qc.setQueryData<ItemWithTopics[]>(
          itemsKey(userId),
          prev.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(itemsKey(userId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: itemsKey(userId) });
    },
  });
}

export function useExtractDump(
  userId: string,
  apiKey: string,
  model: string,
  language: ResponseLanguage,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rawText: string) => {
      const cached =
        qc.getQueryData<ItemWithTopics[]>(itemsKey(userId)) ?? [];
      const existingTopics = Array.from(
        new Set(cached.flatMap((i) => i.topics.map((t) => t.name))),
      ).sort((a, b) => a.localeCompare(b));

      const fxRate = await getUsdToIdrRate();

      let extracted;
      try {
        extracted = await extractItems(
          apiKey,
          model,
          rawText,
          new Date().toISOString(),
          'Asia/Jakarta',
          existingTopics,
          language,
        );
      } catch (err) {
        if (err instanceof OpenRouterCallError && err.usage) {
          await logAiUsage({
            userId,
            noteId: null,
            model: err.model,
            usage: err.usage,
            costUsd: err.costUsd,
            fxRate,
            status: 'error',
            errorMessage: err.message,
          });
        }
        throw err;
      }

      const { response: res, usage, costUsd } = extracted;

      if (res.items.length === 0) {
        await logAiUsage({
          userId,
          noteId: null,
          model,
          usage,
          costUsd,
          fxRate,
          status: 'success',
        });
        return 0;
      }

      const { data: note, error: noteErr } = await supabase
        .from('notes')
        .insert({ raw_text: rawText, user_id: userId })
        .select('id')
        .single();
      if (noteErr || !note) throw noteErr ?? new Error('Failed to insert note');

      await logAiUsage({
        userId,
        noteId: note.id,
        model,
        usage,
        costUsd,
        fxRate,
        status: 'success',
      });

      const uniqueTopicNames = Array.from(
        new Set(res.items.flatMap((i) => i.topics)),
      );

      const topicMap = new Map<string, string>();
      if (uniqueTopicNames.length > 0) {
        const { data: topicRows, error: topicErr } = await supabase
          .from('topics')
          .upsert(
            uniqueTopicNames.map((name) => ({ name, user_id: userId })),
            { onConflict: 'user_id,name' },
          )
          .select('id, name');
        if (topicErr) throw topicErr;
        for (const t of topicRows as Array<{ id: string; name: string }>) {
          topicMap.set(t.name, t.id);
        }
      }

      const { data: itemRows, error: itemErr } = await supabase
        .from('items')
        .insert(
          res.items.map((item) => ({
            note_id: note.id,
            user_id: userId,
            type: item.type,
            content: item.content,
            deadline: item.deadline,
          })),
        )
        .select('id');
      if (itemErr || !itemRows) {
        throw itemErr ?? new Error('Failed to insert items');
      }

      const links = res.items.flatMap((item, idx) =>
        item.topics
          .map((name) => topicMap.get(name))
          .filter((id): id is string => !!id)
          .map((topic_id) => ({
            item_id: (itemRows as Array<{ id: string }>)[idx].id,
            topic_id,
          })),
      );
      if (links.length > 0) {
        const { error: linkErr } = await supabase
          .from('item_topics')
          .insert(links);
        if (linkErr) throw linkErr;
      }

      return res.items.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: itemsKey(userId) });
      qc.invalidateQueries({ queryKey: aiUsageKeys.all(userId) });
    },
  });
}

export function useDeleteItem(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: itemsKey(userId) });
      const prev = qc.getQueryData<ItemWithTopics[]>(itemsKey(userId));
      if (prev) {
        qc.setQueryData<ItemWithTopics[]>(
          itemsKey(userId),
          prev.filter((i) => i.id !== id),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(itemsKey(userId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: itemsKey(userId) });
    },
  });
}

export function useDeleteNote(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', noteId);
      if (error) throw error;
    },
    onMutate: async (noteId) => {
      await qc.cancelQueries({ queryKey: itemsKey(userId) });
      const prev = qc.getQueryData<ItemWithTopics[]>(itemsKey(userId));
      if (prev) {
        qc.setQueryData<ItemWithTopics[]>(
          itemsKey(userId),
          prev.filter((i) => i.note_id !== noteId),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(itemsKey(userId), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: itemsKey(userId) });
    },
  });
}

export function useRawNote(noteId: string | null) {
  return useQuery({
    queryKey: noteKey(noteId ?? ''),
    queryFn: async (): Promise<Pick<NoteRow, 'raw_text' | 'created_at'>> => {
      const { data, error } = await supabase
        .from('notes')
        .select('raw_text, created_at')
        .eq('id', noteId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!noteId,
    staleTime: 5 * 60_000,
  });
}
