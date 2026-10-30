import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { guideVotes } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { VOTABLE_GUIDE_SLUGS, isValidWatchKey } from '@/lib/validation'

// GET /api/guide-votes?slug=under-500
// Returns vote counts per watchKey for a guide
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  if (!VOTABLE_GUIDE_SLUGS.has(slug)) return NextResponse.json({ error: 'Unknown guide' }, { status: 400 })

  const { userId } = await auth()

  const votes = await db
    .select({ watchKey: guideVotes.watchKey })
    .from(guideVotes)
    .where(eq(guideVotes.guideSlug, slug))

  // Count votes per watchKey
  const counts: Record<string, number> = {}
  for (const v of votes) {
    counts[v.watchKey] = (counts[v.watchKey] ?? 0) + 1
  }

  // Find the current user's vote if logged in
  let userVote: string | null = null
  if (userId) {
    const existing = await db
      .select({ watchKey: guideVotes.watchKey })
      .from(guideVotes)
      .where(and(eq(guideVotes.userId, userId), eq(guideVotes.guideSlug, slug)))
      .limit(1)
    userVote = existing[0]?.watchKey ?? null
  }

  return NextResponse.json({ counts, userVote })
}

// POST /api/guide-votes
// Body: { guideSlug, watchKey }
// If user already voted for this watchKey → remove (toggle off)
// If user voted for a different watch → update
// If user has no vote → insert
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { guideSlug, watchKey } = (body && typeof body === 'object' ? body : {}) as { guideSlug?: unknown; watchKey?: unknown }
  if (typeof guideSlug !== 'string' || typeof watchKey !== 'string' || !guideSlug || !watchKey) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (!VOTABLE_GUIDE_SLUGS.has(guideSlug)) {
    return NextResponse.json({ error: 'Unknown guide' }, { status: 400 })
  }
  if (!isValidWatchKey(watchKey)) {
    return NextResponse.json({ error: 'Invalid watchKey' }, { status: 400 })
  }

  // Check for existing vote
  const existing = await db
    .select()
    .from(guideVotes)
    .where(and(eq(guideVotes.userId, userId), eq(guideVotes.guideSlug, guideSlug)))
    .limit(1)

  if (existing.length > 0) {
    if (existing[0].watchKey === watchKey) {
      // Same watch clicked again → deselect (delete)
      await db
        .delete(guideVotes)
        .where(and(eq(guideVotes.userId, userId), eq(guideVotes.guideSlug, guideSlug)))
      return NextResponse.json({ action: 'removed', watchKey: null })
    } else {
      // Different watch → update
      await db
        .update(guideVotes)
        .set({ watchKey, createdAt: new Date() })
        .where(and(eq(guideVotes.userId, userId), eq(guideVotes.guideSlug, guideSlug)))
      return NextResponse.json({ action: 'updated', watchKey })
    }
  }

  // No existing vote → insert
  await db.insert(guideVotes).values({
    id: randomUUID(),
    userId,
    guideSlug,
    watchKey,
  })
  return NextResponse.json({ action: 'added', watchKey })
}
