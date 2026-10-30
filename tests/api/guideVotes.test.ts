import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/nextjs/server'
import { fakeDb } from '../helpers/fakeDb'
import { jsonRequest } from '../helpers/request'
import { POST } from '@/app/api/guide-votes/route'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', async () => ({ db: (await import('../helpers/fakeDb')).fakeDb.db }))

const signIn = (userId: string | null) =>
  vi.mocked(auth).mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>)

const vote = (body: unknown) => POST(jsonRequest('/api/guide-votes', 'POST', body))

beforeEach(() => {
  fakeDb.reset()
  vi.clearAllMocks()
  signIn('user_1')
})

describe('POST /api/guide-votes', () => {
  it('rejects unauthenticated requests', async () => {
    signIn(null)
    expect((await vote({ guideSlug: 'under-500', watchKey: 'seiko:5 sports' })).status).toBe(401)
  })

  it.each([
    ['invalid JSON', '{not json', 'Invalid JSON body'],
    ['a non-object body', 'null', 'Missing fields'],
    ['missing watchKey', { guideSlug: 'under-500' }, 'Missing fields'],
    ['non-string fields', { guideSlug: 500, watchKey: ['x'] }, 'Missing fields'],
    ['an unknown guide', { guideSlug: 'under-9999', watchKey: 'seiko:5' }, 'Unknown guide'],
    ['an uppercase watchKey', { guideSlug: 'under-500', watchKey: 'Seiko:5' }, 'Invalid watchKey'],
    ['a watchKey without a model', { guideSlug: 'under-500', watchKey: 'seiko' }, 'Invalid watchKey'],
    ['an oversized watchKey', { guideSlug: 'under-500', watchKey: `a:${'b'.repeat(200)}` }, 'Invalid watchKey'],
  ])('rejects %s', async (_label, body, error) => {
    const res = await vote(body)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error })
    expect(fakeDb.queries).toHaveLength(0)
  })

  it('records a valid first vote', async () => {
    fakeDb.queueResult([])
    const res = await vote({ guideSlug: 'under-500', watchKey: 'seiko:5 sports' })
    expect(await res.json()).toEqual({ action: 'added', watchKey: 'seiko:5 sports' })
    const insert = fakeDb.queries.find((q) => q.op === 'insert')
    expect(fakeDb.arg(insert, 'values')).toMatchObject({
      userId: 'user_1',
      guideSlug: 'under-500',
      watchKey: 'seiko:5 sports',
    })
  })

  it('toggles off a repeated vote', async () => {
    fakeDb.queueResult([{ watchKey: 'seiko:5 sports' }])
    const res = await vote({ guideSlug: 'under-500', watchKey: 'seiko:5 sports' })
    expect(await res.json()).toEqual({ action: 'removed', watchKey: null })
  })
})
