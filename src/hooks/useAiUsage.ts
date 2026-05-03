import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AiUsageRow } from '@/lib/types';

export const aiUsageKeys = {
  all: (userId: string) => ['ai_usage', userId] as const,
  list: (userId: string, page: number, pageSize: number) =>
    ['ai_usage', userId, 'list', page, pageSize] as const,
  total: (userId: string) => ['ai_usage', userId, 'total'] as const,
  byNote: (userId: string, noteId: string) =>
    ['ai_usage', userId, 'note', noteId] as const,
};

export type AiUsageListResult = {
  rows: AiUsageRow[];
  total: number;
};

export function useAiUsageList(
  userId: string,
  page: number,
  pageSize: number,
  enabled = true,
) {
  return useQuery({
    queryKey: aiUsageKeys.list(userId, page, pageSize),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AiUsageListResult> => {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as AiUsageRow[], total: count ?? 0 };
    },
  });
}

export type AiUsageTotal = {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostIdr: number;
};

export function useAiUsageTotal(userId: string, enabled = true) {
  return useQuery({
    queryKey: aiUsageKeys.total(userId),
    enabled,
    queryFn: async (): Promise<AiUsageTotal> => {
      const { data, error } = await supabase
        .from('ai_usage')
        .select(
          'input_tokens, output_tokens, total_tokens, cost_usd, fx_rate_idr',
        )
        .eq('user_id', userId);
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
        cost_usd: number;
        fx_rate_idr: number;
      }>;
      let totalInput = 0;
      let totalOutput = 0;
      let totalTokens = 0;
      let totalCostIdr = 0;
      for (const r of rows) {
        totalInput += r.input_tokens ?? 0;
        totalOutput += r.output_tokens ?? 0;
        totalTokens += r.total_tokens ?? 0;
        totalCostIdr += Number(r.cost_usd ?? 0) * Number(r.fx_rate_idr ?? 0);
      }
      return {
        totalCalls: rows.length,
        totalInputTokens: totalInput,
        totalOutputTokens: totalOutput,
        totalTokens,
        totalCostIdr,
      };
    },
  });
}

export function useNoteUsage(userId: string, noteId: string | null) {
  return useQuery({
    queryKey: aiUsageKeys.byNote(userId, noteId ?? ''),
    enabled: !!noteId,
    queryFn: async (): Promise<AiUsageRow | null> => {
      const { data, error } = await supabase
        .from('ai_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('note_id', noteId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as AiUsageRow | null;
    },
    staleTime: 5 * 60_000,
  });
}
