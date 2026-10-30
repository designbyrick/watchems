import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/redis', () => ({ getRedis: () => null }))

/** `lib/ratelimit` reads NODE_ENV at import time, so re-import it per environment. */
async function loadRatelimit(nodeEnv: string) {
  vi.stubEnv('NODE_ENV', nodeEnv)
  vi.stubEnv('VERCEL_ENV', '')
  vi.resetModules()
  return import('@/lib/ratelimit')
}

const request = () => new NextRequest('http://localhost/api/photos/all')

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('rate limiting without Redis', () => {
  it('checkReadRateLimit fails open, even in production', async () => {
    const { checkReadRateLimit } = await loadRatelimit('production')
    expect(await checkReadRateLimit(request())).toEqual({ success: true })
  })

  it('checkRateLimit blocks uploads in production', async () => {
    const { checkRateLimit, checkIdentifyRateLimit, checkSubscribeRateLimit } = await loadRatelimit('production')
    expect(await checkRateLimit('user_1')).toEqual({ success: false })
    expect(await checkIdentifyRateLimit('user_1')).toEqual({ success: false })
    expect(await checkSubscribeRateLimit(request())).toEqual({ success: false })
  })

  it('checkRateLimit allows in development', async () => {
    const { checkRateLimit } = await loadRatelimit('development')
    expect(await checkRateLimit('user_1')).toEqual({ success: true })
  })
})

describe('getClientIp', () => {
  it('uses the first x-forwarded-for entry', async () => {
    const { getClientIp } = await loadRatelimit('test')
    const req = new NextRequest('http://localhost/', { headers: { 'x-forwarded-for': ' 1.2.3.4 , 10.0.0.1' } })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })
})
