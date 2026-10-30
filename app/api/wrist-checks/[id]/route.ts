import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { wristChecks } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/** DELETE /api/wrist-checks/[id] — remove a wrist check entry */
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const entryId = params.id
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  try {
    const entry = await db
      .select({ id: wristChecks.id })
      .from(wristChecks)
      .where(and(eq(wristChecks.id, entryId), eq(wristChecks.userId, userId)))
      .limit(1)

    if (entry.length === 0) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    await db.delete(wristChecks).where(eq(wristChecks.id, entryId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting wrist check:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
