const DELAYS_MS = [60_000, 300_000, 900_000] // 1min, 5min, 15min

export function getRetryDelayMs(tentativas: number): number {
  const idx = Math.min(tentativas - 1, DELAYS_MS.length - 1)
  return DELAYS_MS[idx]
}

export function isRetryable(tentativas: number): boolean {
  return tentativas < 3
}
