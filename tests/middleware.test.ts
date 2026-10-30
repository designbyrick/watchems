import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Without Clerk keys the middleware exports the plain handler (no clerkMiddleware)
vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', '')
vi.stubEnv('CLERK_SECRET_KEY', '')
vi.stubEnv('DATABASE_URL', '')

const { default: middleware } = await import('@/middleware')

const run = (path: string) =>
  (middleware as (req: NextRequest) => Promise<Response>)(new NextRequest(new URL(path, 'http://localhost')))

const scriptSrc = (res: Response) =>
  res.headers.get('Content-Security-Policy')?.split('; ').find((d) => d.startsWith('script-src')) ?? ''

describe('middleware CSP', () => {
  it.each(['/', '/page/2', '/page/2/'])('serves ISR page %s without a nonce', async (path) => {
    const src = scriptSrc(await run(path))
    expect(src).toContain("'unsafe-inline'")
    expect(src).not.toContain('nonce-')
    expect(src).not.toContain("'strict-dynamic'")
  })

  it.each(['/about', '/brand/rolex', '/page/abc', '/pages'])('uses a per-request nonce on %s', async (path) => {
    const src = scriptSrc(await run(path))
    expect(src).toMatch(/'nonce-[^']+' 'strict-dynamic'/)
    expect(src).not.toContain("'unsafe-inline'")
  })

  it('issues a fresh nonce per request', async () => {
    expect(scriptSrc(await run('/about'))).not.toBe(scriptSrc(await run('/about')))
  })
})
