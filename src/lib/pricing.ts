export const GEMINI_MODEL = 'gemini-2.5-flash-lite';

export const MODEL_PRICING: Record<
  string,
  { inputPerMillion: number; outputPerMillion: number }
> = {
  'gemini-2.5-flash-lite': {
    inputPerMillion: 0.1,
    outputPerMillion: 0.4,
  },
};

export const FX_FALLBACK_USD_TO_IDR = 16500;

export function computeCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (
    (inputTokens / 1_000_000) * pricing.inputPerMillion +
    (outputTokens / 1_000_000) * pricing.outputPerMillion
  );
}

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const idrPreciseFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export function formatIdr(usd: number, fxRate: number): string {
  return formatIdrAmount(usd * fxRate);
}

export function formatIdrAmount(idr: number): string {
  if (idr > 0 && idr < 1) return idrPreciseFormatter.format(idr);
  return idrFormatter.format(idr);
}
