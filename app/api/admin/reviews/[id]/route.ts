import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { approveReview, rejectReview } from '@/lib/reviews'
import { checkAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'

interface ApproveRejectBody {
  action: 'approve' | 'reject'
  watchSlug: string
}

/**
 * PATCH /api/admin/reviews/[id]
 * Approve or reject a pending review (admin only)
 */
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = await props.params;
  try {
    const { userId } = await auth()

    if (!userId || !checkAdmin(userId)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body: ApproveRejectBody = await request.json()

    // Validation
    if (!body.action || !['approve', 'reject'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    if (!body.watchSlug) {
      return NextResponse.json(
        { error: 'watchSlug is required' },
        { status: 400 }
      )
    }

    const reviewId = params.id

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      )
    }

    try {
      if (body.action === 'approve') {
        await approveReview(body.watchSlug, reviewId)
      } else {
        await rejectReview(body.watchSlug, reviewId)
      }

      return NextResponse.json(
        { message: `Review ${body.action}d successfully` },
        { status: 200 }
      )
    } catch (error) {
      if (error instanceof Error && error.message === 'Review not found') {
        return NextResponse.json(
          { error: 'Review not found' },
          { status: 404 }
        )
      }
      throw error
    }
  } catch (error) {
    console.error('Error approving/rejecting review:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
