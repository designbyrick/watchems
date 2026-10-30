export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { checkSubscribeRateLimit } from '@/lib/ratelimit'

interface SubscribeBody {
  email: string
}

/**
 * POST /api/quiz/subscribe
 * Store user email from quiz completion
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { success } = await checkSubscribeRateLimit(request)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429 }
      )
    }

    const body: Partial<SubscribeBody> | null = await request.json()

    if (typeof body?.email !== 'string' || !body.email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const email = body.email.trim().toLowerCase()

    // Basic email validation (254 = RFC 5321 max address length)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (email.length > 254 || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const redis = getRedis()
    if (!redis) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Store email in Redis set
    await redis.sadd('quiz:emails', email)

    return NextResponse.json(
      { success: true, message: 'Email saved' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error subscribing email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
