import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@clerk/nextjs/server'
import { deletePhotoFromR2 } from '@/lib/r2'
import { photos, photoLikes, collectionItems } from '@/lib/db/schema'
import { fakeDb, renderSql } from '../helpers/fakeDb'
import { jsonRequest, params } from '../helpers/request'
import { DELETE, PATCH } from '@/app/api/user/photos/[photoId]/route'

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', async () => ({ db: (await import('../helpers/fakeDb')).fakeDb.db }))
vi.mock('@/lib/r2', () => ({ isR2Configured: true, deletePhotoFromR2: vi.fn(async () => true) }))

const signIn = (userId: string | null) =>
  vi.mocked(auth).mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>)

const patch = (fields: unknown) =>
  PATCH(jsonRequest('/api/user/photos/p1', 'PATCH', { fields }), params({ photoId: 'p1' }))

const approvedPhoto = {
  id: 'p1',
  status: 'approved',
  brandName: 'Omega',
  modelName: 'Seamaster',
  referenceNumber: '210.30',
}

beforeEach(() => {
  fakeDb.reset()
  vi.clearAllMocks()
  signIn('user_1')
})

describe('PATCH /api/user/photos/[photoId]', () => {
  it('rejects unauthenticated requests', async () => {
    signIn(null)
    const res = await patch({ movement: 'Automatic' })
    expect(res.status).toBe(401)
    expect(fakeDb.queries).toHaveLength(0)
  })

  it('rejects angle brackets', async () => {
    const res = await patch({ modelName: '<img src=x onerror=alert(1)>' })
    expect(res.status).toBe(400)
    expect(fakeDb.queries).toHaveLength(0)
  })

  it('ignores fields outside the allowlist', async () => {
    const res = await patch({ status: 'approved', userId: 'someone-else' })
    expect(res.status).toBe(400)
    expect(fakeDb.queries).toHaveLength(0)
  })

  it('caps field length at 120 chars', async () => {
    fakeDb.queueResult([{ ...approvedPhoto, status: 'pending' }])
    const res = await patch({ movement: 'x'.repeat(500) })
    expect(res.status).toBe(200)
    const update = fakeDb.queries.find((q) => q.op === 'update')
    expect((fakeDb.arg(update, 'set') as { movement: string }).movement).toHaveLength(120)
  })

  it('only looks up photos owned by the caller', async () => {
    fakeDb.queueResult([])
    const res = await patch({ movement: 'Automatic' })
    expect(res.status).toBe(404)
    const where = renderSql(fakeDb.arg(fakeDb.queries[0], 'where'))
    expect(where.sql).toContain('"photos"."user_id" = $')
    expect(where.params).toContain('user_1')
    expect(fakeDb.queries.some((q) => q.op === 'update')).toBe(false)
  })

  it.each(['brandName', 'modelName', 'referenceNumber'])(
    'sends an approved photo back to review when %s changes',
    async (key) => {
      fakeDb.queueResult([approvedPhoto])
      const res = await patch({ [key]: 'Something else' })
      expect(await res.json()).toEqual({ success: true, status: 'pending_review' })
      const update = fakeDb.queries.find((q) => q.op === 'update')
      expect(fakeDb.arg(update, 'update')).toBe(photos)
      expect(fakeDb.arg(update, 'set')).toEqual({ [key]: 'Something else', status: 'pending' })
    }
  )

  it('keeps approval when identity fields are resent unchanged', async () => {
    fakeDb.queueResult([approvedPhoto])
    const res = await patch({ brandName: ' Omega ', modelName: 'Seamaster', movement: 'Automatic' })
    expect(await res.json()).toEqual({ success: true, status: 'approved' })
    const set = fakeDb.arg(fakeDb.queries.find((q) => q.op === 'update'), 'set')
    expect(set).not.toHaveProperty('status')
  })

  it('keeps approval when only non-identity fields change', async () => {
    fakeDb.queueResult([approvedPhoto])
    const res = await patch({ caseSize: '41mm' })
    expect(await res.json()).toEqual({ success: true, status: 'approved' })
  })
})

describe('DELETE /api/user/photos/[photoId]', () => {
  const del = () => DELETE(jsonRequest('/api/user/photos/p1', 'DELETE'), params({ photoId: 'p1' }))

  it('rejects unauthenticated requests', async () => {
    signIn(null)
    expect((await del()).status).toBe(401)
    expect(fakeDb.queries).toHaveLength(0)
  })

  it("does nothing when the photo isn't the caller's", async () => {
    fakeDb.queueResult([])
    const res = await del()
    expect(res.status).toBe(404)
    const where = renderSql(fakeDb.arg(fakeDb.queries[0], 'where'))
    expect(where.params).toEqual(['p1', 'user_1'])
    expect(fakeDb.queries.some((q) => q.op === 'delete')).toBe(false)
    expect(deletePhotoFromR2).not.toHaveBeenCalled()
  })

  it('removes the photo, its likes and board items, and all R2 files', async () => {
    fakeDb.queueResult([
      {
        id: 'p1',
        url: 'https://r2.example/p1.webp',
        thumbnailUrl: 'https://r2.example/p1-thumb.webp',
        originalUrl: 'https://r2.example/p1-orig.jpg',
      },
    ])
    const res = await del()
    expect(res.status).toBe(200)

    const deletedTables = fakeDb.queries.filter((q) => q.op === 'delete').map((q) => fakeDb.arg(q, 'delete'))
    expect(deletedTables).toEqual([photos, photoLikes, collectionItems])

    expect(vi.mocked(deletePhotoFromR2).mock.calls.map((c) => c[0]).sort()).toEqual([
      'https://r2.example/p1-orig.jpg',
      'https://r2.example/p1-thumb.webp',
      'https://r2.example/p1.webp',
    ])
  })

  it('skips missing and duplicate file URLs', async () => {
    fakeDb.queueResult([{ id: 'p1', url: 'https://r2.example/p1.webp', thumbnailUrl: null, originalUrl: 'https://r2.example/p1.webp' }])
    await del()
    expect(deletePhotoFromR2).toHaveBeenCalledTimes(1)
  })
})
