import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkReadRateLimit } from '@/lib/ratelimit'
import { fakeDb } from '../helpers/fakeDb'
import { jsonRequest } from '../helpers/request'
import { GET } from '@/app/api/photos/all/route'

vi.mock('@/lib/db', async () => ({ db: (await import('../helpers/fakeDb')).fakeDb.db }))
vi.mock('@/lib/ratelimit', () => ({ checkReadRateLimit: vi.fn(async () => ({ success: true })) }))

const get = (query: string) => GET(jsonRequest(`/api/photos/all${query}`, 'GET'))

/** The page query asks for `limit + 1` rows to detect a next page. */
const requestedRows = () => fakeDb.arg(fakeDb.queries.find((q) => q.op === 'select'), 'limit')

beforeEach(() => {
  fakeDb.reset()
  vi.clearAllMocks()
})

describe('GET /api/photos/all', () => {
  it.each([
    ['', 51],
    ['?limit=20', 21],
    ['?limit=abc', 51],
    ['?limit=NaN', 51],
    ['?limit=', 51],
    ['?limit=0', 2],
    ['?limit=-10', 2],
    ['?limit=100000', 101],
  ])('clamps %s to a safe page size', async (query, rows) => {
    const res = await get(query)
    expect(res.status).toBe(200)
    expect(requestedRows()).toBe(rows)
  })

  it('rejects an invalid cursor', async () => {
    const res = await get('?cursor=not-a-date')
    expect(res.status).toBe(400)
    expect(fakeDb.queries).toHaveLength(0)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(checkReadRateLimit).mockResolvedValueOnce({ success: false } as Awaited<ReturnType<typeof checkReadRateLimit>>)
    expect((await get('')).status).toBe(429)
    expect(fakeDb.queries).toHaveLength(0)
  })

  it('ignores unsupported price/case-size params', async () => {
    const res = await get('?priceMin=abc&caseSizeMax=xyz')
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ photos: [], totalCount: 0 })
  })
})
