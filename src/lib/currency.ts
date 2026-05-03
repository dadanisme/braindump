import { supabase } from './supabase';
import { FX_FALLBACK_USD_TO_IDR } from './pricing';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FX_API_URL = 'https://open.er-api.com/v6/latest/USD';

export async function getUsdToIdrRate(): Promise<number> {
  const { data: cached } = await supabase
    .from('currency_rates')
    .select('rate, fetched_at')
    .eq('base', 'USD')
    .eq('target', 'IDR')
    .maybeSingle();

  const cachedFresh =
    cached &&
    Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS;

  if (cachedFresh) return Number(cached.rate);

  try {
    const res = await fetch(FX_API_URL);
    if (!res.ok) throw new Error(`FX API ${res.status}`);
    const json = (await res.json()) as { rates?: Record<string, number> };
    const rate = json.rates?.IDR;
    if (typeof rate !== 'number' || !Number.isFinite(rate)) {
      throw new Error('Missing IDR rate in FX response');
    }

    await supabase.from('currency_rates').upsert(
      {
        base: 'USD',
        target: 'IDR',
        rate,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'base,target' },
    );

    return rate;
  } catch {
    if (cached) return Number(cached.rate);
    return FX_FALLBACK_USD_TO_IDR;
  }
}
