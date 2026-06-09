import { useQuery } from '@tanstack/react-query';
import { OPENROUTER_API_URL } from '@/lib/openrouter';

export type OpenRouterModel = {
  id: string;
  name: string;
  promptPerMillion: number;
  completionPerMillion: number;
  contextLength: number;
};

type ModelsResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    context_length?: number;
    pricing?: { prompt?: string; completion?: string };
  }>;
};

async function fetchModels(): Promise<OpenRouterModel[]> {
  // Server-side capability filter: only models that honor strict json_schema.
  const res = await fetch(
    `${OPENROUTER_API_URL}/models?supported_parameters=structured_outputs`,
  );
  if (!res.ok) throw new Error(`Failed to load models (HTTP ${res.status})`);
  const json = (await res.json()) as ModelsResponse;
  return (json.data ?? [])
    .filter((m): m is { id: string; name: string } & typeof m => !!m.id)
    .map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      promptPerMillion: parseFloat(m.pricing?.prompt ?? '0') * 1_000_000,
      completionPerMillion:
        parseFloat(m.pricing?.completion ?? '0') * 1_000_000,
      contextLength: m.context_length ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function useOpenRouterModels(enabled = true) {
  return useQuery({
    queryKey: ['openrouter-models'],
    queryFn: fetchModels,
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
