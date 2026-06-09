export const FX_FALLBACK_USD_TO_IDR = 16500;

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
