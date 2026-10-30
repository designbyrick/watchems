export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { getRedis } from '@/lib/redis'
import { sendImageHealthAlertEmail, type ImageHealthCheckResult } from '@/lib/email'

/**
 * Image Health Monitoring Cron Job
 * Vercel Cron runs it once a day (Hobby plan limit, see vercel.json); an
 * external pinger (cron-job.org) calls it every 15 minutes with the same
 * `Authorization: Bearer $CRON_SECRET` header. See MONITORING_CRON.md.
 * Loads the most recent approved photo and checks that it is served both
 * directly from Cloudflare R2 and through the Next.js image optimizer.
 * Emails the owner when a failure streak starts, a reminder every few hours
 * while it continues, and once when it recovers.
 *
 * Background: on 2026-10-29 the R2 subscription was silently removed, every
 * r2.dev URL returned 403 and /_next/image returned 502 with no alert.
 */

const SITE_URL = 'https://watchems.com'
const ALERT_TO = process.env.IMAGE_HEALTH_ALERT_EMAIL || 'gusman.design4@gmail.com'
const REQUEST_TIMEOUT_MS = 10_000
const REMINDER_INTERVAL_MS = 6 * 60 * 60 * 1000 // re-alert every 6h while still failing
const STATE_KEY = 'image-health:state'

interface HealthState {
  failingSince: string | null
  lastAlertAt: string | null
}

function verifyCronSecret(request: NextRequest): boolean {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when set
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return process.env.NODE_ENV === 'development'
  }
  return request.headers.get('authorization') === `Bearer ${secret}`
}

async function checkUrl(label: string, url: string, method: 'HEAD' | 'GET'): Promise<ImageHealthCheckResult> {
  try {
    const res = await fetch(url, {
      method,
      cache: 'no-store',
      redirect: 'follow',
      headers: { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    // Don't download the optimized image body — only the status matters
    await res.body?.cancel()
    return { label, url, status: res.status }
  } catch (err) {
    return { label, url, status: null, error: (err as Error).message }
  }
}

async function loadState(): Promise<HealthState | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    return (await redis.get<HealthState>(STATE_KEY)) ?? { failingSince: null, lastAlertAt: null }
  } catch (err) {
    console.error('[image-health] Failed to read state from Redis:', err)
    return null
  }
}

async function saveState(state: HealthState): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.set(STATE_KEY, state)
  } catch (err) {
    console.error('[image-health] Failed to write state to Redis:', err)
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let photoUrl: string
  try {
    const [photo] = await getDb()
      .select({ url: photos.url })
      .from(photos)
      .where(eq(photos.status, 'approved'))
      .orderBy(desc(photos.createdAt))
      .limit(1)
    if (!photo) {
      return NextResponse.json({ status: 'skipped', message: 'No approved photos found' })
    }
    photoUrl = photo.url
  } catch (err) {
    console.error('[image-health] Failed to load a photo from the database:', err)
    return NextResponse.json({ status: 'error', error: 'Database query failed' }, { status: 500 })
  }

  const optimizerUrl = `${SITE_URL}/_next/image?url=${encodeURIComponent(photoUrl)}&w=640&q=75`
  // The optimizer is GET-only in practice, so request it and discard the body
  const checks = await Promise.all([
    checkUrl('R2 direct', photoUrl, 'HEAD'),
    checkUrl('Next image optimizer', optimizerUrl, 'GET'),
  ])
  const failing = checks.some((c) => c.status !== 200)
  const now = new Date()

  const state = await loadState()
  let alert: 'failing' | 'recovered' | null = null
  let nextState: HealthState | null = null

  if (state) {
    if (failing) {
      const lastAlert = state.lastAlertAt ? new Date(state.lastAlertAt).getTime() : 0
      if (!state.failingSince || now.getTime() - lastAlert >= REMINDER_INTERVAL_MS) {
        alert = 'failing'
      }
      nextState = { failingSince: state.failingSince ?? now.toISOString(), lastAlertAt: state.lastAlertAt }
    } else if (state.failingSince) {
      alert = 'recovered'
      nextState = { failingSince: null, lastAlertAt: null }
    }
  } else if (failing && now.getUTCMinutes() < 15) {
    // No Redis: can't track streaks, so alert at most once per hour
    // (only runs in the first 15 minutes of each hour send)
    alert = 'failing'
  }

  let emailSent = false
  if (alert) {
    const result = await sendImageHealthAlertEmail(ALERT_TO, {
      kind: alert,
      checks,
      failingSince: state?.failingSince ?? undefined,
    })
    emailSent = result.success
    // Only record the alert if it actually went out, so a Resend hiccup retries next run
    if (emailSent && nextState && alert === 'failing') nextState.lastAlertAt = now.toISOString()
    if (!emailSent && alert === 'recovered') nextState = null
  }

  if (nextState) await saveState(nextState)

  const body = {
    timestamp: now.toISOString(),
    status: failing ? 'failing' : 'healthy',
    checks,
    alert,
    emailSent,
    stateTracking: state ? 'redis' : 'none',
  }
  if (failing) console.error('[image-health] Image check failed:', JSON.stringify(checks))

  return NextResponse.json(body, { status: failing ? 503 : 200 })
}
