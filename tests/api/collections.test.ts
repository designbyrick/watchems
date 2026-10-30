import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/nextjs/server'
import { fakeDb, renderSql } from '../helpers/fakeDb'
import { jsonRequest, params } from '../helpers/request'
import { GET as getBoard } from '@/app/api/collections/[id]/route'
import { GET as listBoards } from '@/app/api/collections/route'
import { POST as addItem } from '@/app/api/collections/[id]/items/route'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', async () => ({ db: (await import('../helpers/fakeDb')).fakeDb.db }))

beforeEach(() => {
  fakeDb.reset()
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ userId: 'user_1' } as Awaited<ReturnType<typeof auth>>)
})

/** Soft-deleted (status = 'deleted') and unreviewed photos must never appear in boards. */
describe('boards only show approved photos', () => {
  it('GET /api/collections/[id] filters joined photos to approved', async () => {
    fakeDb.queueResult([{ id: 'c1', name: 'Divers', createdAt: new Date() }])
    fakeDb.queueResult([])
    const res = await getBoard(jsonRequest('/api/collections/c1', 'GET'), params({ id: 'c1' }))
    expect(res.status).toBe(200)

    const where = renderSql(fakeDb.arg(fakeDb.queries[1], 'where'))
    expect(where.sql).toMatch(/"photos"\."status" = \$\d/)
    expect(where.params).toContain('approved')
  })

  it('GET /api/collections counts and covers only approved photos', async () => {
    fakeDb.queueResult([])
    await listBoards()
    const query = fakeDb.queries[0]

    const join = query.calls.find((c) => c.method === 'leftJoin' && renderSql(c.args[1]).sql.includes('"photos"'))
    const on = renderSql(join?.args[1])
    expect(on.sql).toMatch(/"photos"\."status" = \$\d/)
    expect(on.params).toContain('approved')

    // Counting collection_items would include items whose photo was deleted
    const fields = fakeDb.arg(query, 'select') as { itemCount: unknown }
    expect(renderSql(fields.itemCount).sql).toContain('count("photos"."id")')
  })

  it('POST /api/collections/[id]/items refuses non-approved photos', async () => {
    fakeDb.queueResult([{ id: 'c1' }])
    fakeDb.queueResult([])
    const res = await addItem(jsonRequest('/api/collections/c1/items', 'POST', { photoId: 'p1' }), params({ id: 'c1' }))
    expect(res.status).toBe(404)
    expect(renderSql(fakeDb.arg(fakeDb.queries[1], 'where')).params).toContain('approved')
    expect(fakeDb.queries.some((q) => q.op === 'insert')).toBe(false)
  })
})
