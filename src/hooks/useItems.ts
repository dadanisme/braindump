import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { extractItems } from '../lib/gemini';
import type { ResponseLanguage } from '@/hooks/useLanguageSetting';
import type {
  ItemRow,
  ItemTopicRow,
  ItemWithTopics,
  NoteRow,
  TopicRow,
} from '../lib/types';

export function itemsKey(userId: string) {
  return ['items', userId] as const;
}

export function noteKey(noteId: string) {
  return ['note', noteId] as const;
}

async function fetchItems(userId: string): Promise<ItemWithTopics[]> {
  const [itemsRes, topicsRes, linksRes] = await Promise.all([
    supabase
      .from('items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase.from('topics').select('*').eq('user_id', userId),
    supabase.from('item_topics').select('*'),
  ]);
  if (itemsRes.error) throw itemsRes.error;
  if (topicsRes.error) throw topicsRes.error;
  if (linksRes.error) throw linksRes.error;

  const topicById = new Map<string, TopicRow>();
  for (const t of topicsRes.data as TopicRow[]) topicById.set(t.id, t);

  const topicsByItem = new Map<string, TopicRow[]>();
  for (const link of linksRes.data as ItemTopicRow[]) {
    const topic = topicById.get(link.topic_id);
    if (!topic) continue;
    const arr = topicsByItem.get(link.item_id) ?? [];
    arr.push(topic);
    topicsByItem.set(link.item_id, arr);
  }

  return (itemsRes.data as ItemRow[]).map((it) => ({
    ...it,
    topics: topicsByItem.get(it.id) ?? [],
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

      const res = await extractItems(
        apiKey,
        rawText,
        new Date().toISOString(),
        'Asia/Jakarta',
        existingTopics,
        language,
      );

      if (res.items.length === 0) return 0;

      const { data: note, error: noteErr } = await supabase
        .from('notes')
        .insert({ raw_text: rawText, user_id: userId })
        .select('id')
        .single();
      if (noteErr || !note) throw noteErr ?? new Error('Failed to insert note');

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
