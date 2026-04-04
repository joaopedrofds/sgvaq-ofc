import { describe, it, expect } from 'vitest'
import { getRetryDelayMs, isRetryable } from '../../supabase/functions/process-notifications/retry-schedule'

describe('getRetryDelayMs', () => {
  it('returns 1 minute delay for first retry (tentativas=1)', () => {
    expect(getRetryDelayMs(1)).toBe(60_000)
  })
  it('returns 5 minute delay for second retry (tentativas=2)', () => {
    expect(getRetryDelayMs(2)).toBe(300_000)
  })
  it('returns 15 minute delay for third retry (tentativas=3)', () => {
    expect(getRetryDelayMs(3)).toBe(900_000)
  })
})

describe('isRetryable', () => {
  it('returns true when tentativas < 3', () => {
    expect(isRetryable(0)).toBe(true)
    expect(isRetryable(2)).toBe(true)
  })
  it('returns false when tentativas >= 3', () => {
    expect(isRetryable(3)).toBe(false)
    expect(isRetryable(5)).toBe(false)
  })
})
