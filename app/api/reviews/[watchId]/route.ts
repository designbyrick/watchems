import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isValidSlug, sanitizeText } from '@/lib/validation'
import { getRedis } from '@/lib/redis'
import { checkRateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

export interface PendingReview {
  id: string
  watchId: string
  userId: string
  rating: number
  title: string
  body: string
  ownerFor?: string
  createdAt: string
  approved: false
}

export interface ApprovedReview {
  id: string
  watchId: string
  userId: string
  rating: number
  title: string
  body: string
  ownerFor?: string
  createdAt: string
  approved: true
}

export async function GET(_req: NextRequest, props: { params: Promise<{ watchId: string }> }) {
  const params = await props.params;
  if (!isValidSlug(params.watchId)) {
    return NextResponse.json([], { status: 400 })
  }
  const redis = getRedis()
  if (!redis) return NextResponse.json([])
  const reviews = await redis.get(`reviews:${params.watchId}`) as ApprovedReview[] | null
  return NextResponse.json(reviews ?? [])
}

export async function POST(req: NextRequest, props: { params: Promise<{ watchId: string }> }) {
  const params = await props.params;
  if (!isValidSlug(params.watchId)) {
    return NextResponse.json({ error: 'Invalid watch ID' }, { status: 400 })
  }

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { success } = await checkRateLimit(userId)
  if (!success) return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 })

  const body = await req.json() as { rating?: number; title?: string; body?: string; ownerFor?: string }
  const { rating, title, body: reviewBody, ownerFor } = body

  if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
  }
  if (!title || title.trim().length === 0 || title.length > 80) {
    return NextResponse.json({ error: 'Title is required (max 80 chars)' }, { status: 400 })
  }
  if (!reviewBody || reviewBody.length < 50 || reviewBody.length > 1000) {
    return NextResponse.json({ error: 'Review body must be 50–1000 characters' }, { status: 400 })
  }

  const review: PendingReview = {
    id: Date.now().toString(),
    watchId: params.watchId,
    userId,
    rating,
    title: sanitizeText(title, 80),
    body: sanitizeText(reviewBody, 1000),
    ...(ownerFor ? { ownerFor: sanitizeText(ownerFor, 50) } : {}),
    createdAt: new Date().toISOString(),
    approved: false,
  }

  const redis = getRedis()
  if (!redis) return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 })

  const existing = await redis.get(`reviews:pending:${params.watchId}`) as PendingReview[] | null
  await redis.set(`reviews:pending:${params.watchId}`, [...(existing ?? []), review])

  return NextResponse.json({ success: true })
}
