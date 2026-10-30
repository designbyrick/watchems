export const dynamic = 'force-dynamic'
// PageSpeed Insights runs a full Lighthouse pass and can take 20–40s
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Core Web Vitals Monitoring Cron Job
 * Runs nightly at 02:00 UTC via Vercel Cron Jobs (see vercel.json)
 * Fetches CrUX field data (p75, real users) from the PageSpeed Insights API
 * Logs metrics: LCP, INP, CLS
 * Alerts if thresholds are breached
 */

// Thresholds ("good" boundaries for p75)
const THRESHOLDS = {
  lcp: 2.5, // seconds
  inp: 0.2, // seconds (200ms)
  cls: 0.1, // unitless
}

interface CruxMetric {
  percentile?: number
  category?: string
}

interface LoadingExperience {
  metrics?: {
    LARGEST_CONTENTFUL_PAINT_MS?: CruxMetric
    INTERACTION_TO_NEXT_PAINT?: CruxMetric
    // CrUX reports CLS multiplied by 100 (e.g. 5 = 0.05)
    CUMULATIVE_LAYOUT_SHIFT_SCORE?: CruxMetric
  }
}

interface PageSpeedResponse {
  // Field data for this exact URL
  loadingExperience?: LoadingExperience
  // Field data aggregated over the whole origin (fallback when the URL has too little traffic)
  originLoadingExperience?: LoadingExperience
  error?: { code?: number; message?: string }
}

/**
 * Fetch PageSpeed Insights data for a URL
 */
async function fetchPageSpeedInsights(url: string): Promise<PageSpeedResponse> {
  const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')
  apiUrl.searchParams.append('url', url)
  apiUrl.searchParams.append('category', 'performance')
  apiUrl.searchParams.append('strategy', 'mobile')
  // Without a key, requests share a tiny anonymous quota and often get 429
  if (process.env.PAGESPEED_API_KEY) {
    apiUrl.searchParams.append('key', process.env.PAGESPEED_API_KEY)
  }

  const res = await fetch(apiUrl.toString(), { cache: 'no-store' })
  const data = (await res.json()) as PageSpeedResponse
  if (!res.ok || data.error) {
    throw new Error(`PageSpeed Insights API error ${res.status}: ${data.error?.message ?? res.statusText}`)
  }
  return data
}

interface CoreWebVitalsMetrics {
  lcp: number | null
  inp: number | null
  cls: number | null
  source: 'url' | 'origin' | null
  timestamp: string
}

/**
 * Extract Core Web Vitals (CrUX p75) from PageSpeed Insights response
 */
function extractCoreWebVitals(data: PageSpeedResponse): CoreWebVitalsMetrics {
  const source = data.loadingExperience?.metrics ? 'url' : data.originLoadingExperience?.metrics ? 'origin' : null
  const metrics = (source === 'url' ? data.loadingExperience : data.originLoadingExperience)?.metrics ?? {}

  const lcpMs = metrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile
  const inpMs = metrics.INTERACTION_TO_NEXT_PAINT?.percentile
  const clsX100 = metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile

  return {
    lcp: lcpMs !== undefined ? lcpMs / 1000 : null,
    inp: inpMs !== undefined ? inpMs / 1000 : null,
    cls: clsX100 !== undefined ? clsX100 / 100 : null,
    source,
    timestamp: new Date().toISOString(),
  }
}

interface Alert {
  level: string
  metric: string
  value: string
  unit: string
  threshold: number
  message: string
}

/**
 * Check thresholds and generate alerts
 */
function checkThresholds(metrics: CoreWebVitalsMetrics): Alert[] {
  const alerts: Alert[] = []

  if (metrics.lcp !== null && metrics.lcp > THRESHOLDS.lcp) {
    alerts.push({
      level: 'warning',
      metric: 'LCP',
      value: metrics.lcp.toFixed(2),
      unit: 's',
      threshold: THRESHOLDS.lcp,
      message: `LCP exceeds threshold: ${metrics.lcp.toFixed(2)}s > ${THRESHOLDS.lcp}s`,
    })
  }

  if (metrics.inp !== null && metrics.inp > THRESHOLDS.inp) {
    alerts.push({
      level: 'warning',
      metric: 'INP',
      value: metrics.inp.toFixed(3),
      unit: 's',
      threshold: THRESHOLDS.inp,
      message: `INP exceeds threshold: ${metrics.inp.toFixed(3)}s > ${THRESHOLDS.inp}s`,
    })
  }

  if (metrics.cls !== null && metrics.cls > THRESHOLDS.cls) {
    alerts.push({
      level: 'warning',
      metric: 'CLS',
      value: metrics.cls.toFixed(3),
      unit: 'unitless',
      threshold: THRESHOLDS.cls,
      message: `CLS exceeds threshold: ${metrics.cls.toFixed(3)} > ${THRESHOLDS.cls}`,
    })
  }

  return alerts
}

/**
 * Verify the cron secret. Vercel sends `Authorization: Bearer ${CRON_SECRET}`
 * automatically when the CRON_SECRET env var is set on the project.
 */
function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET
  if (!secret) {
    // In development, allow requests when no secret is configured
    return process.env.NODE_ENV === 'development'
  }

  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(request.headers.get('authorization') ?? '')
  return received.length === expected.length && crypto.timingSafeEqual(received, expected)
}

function fmt(value: number | null, digits: number, unit = ''): string {
  return value !== null ? value.toFixed(digits) + unit : 'N/A'
}

function ok(value: number | null, threshold: number): string {
  return value !== null && value <= threshold ? '✅' : '⚠️'
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[${new Date().toISOString()}] Fetching Core Web Vitals for watchems.com...`)

    const data = await fetchPageSpeedInsights('https://watchems.com')
    const metrics = extractCoreWebVitals(data)
    const alerts = checkThresholds(metrics)

    const logEntry = {
      timestamp: metrics.timestamp,
      source: metrics.source,
      metrics: {
        lcp: metrics.lcp !== null ? parseFloat(metrics.lcp.toFixed(2)) : null,
        inp: metrics.inp !== null ? parseFloat(metrics.inp.toFixed(3)) : null,
        cls: metrics.cls !== null ? parseFloat(metrics.cls.toFixed(3)) : null,
      },
      alerts: alerts.length > 0 ? alerts : null,
      status: metrics.source === null ? 'no-data' : alerts.length > 0 ? 'degraded' : 'healthy',
    }

    console.log(`✅ Core Web Vitals recorded (CrUX p75, source: ${metrics.source ?? 'none'}):`)
    console.log(`  LCP: ${fmt(metrics.lcp, 2, 's')} ${ok(metrics.lcp, THRESHOLDS.lcp)}`)
    console.log(`  INP: ${fmt(metrics.inp, 3, 's')} ${ok(metrics.inp, THRESHOLDS.inp)}`)
    console.log(`  CLS: ${fmt(metrics.cls, 3)} ${ok(metrics.cls, THRESHOLDS.cls)}`)
    console.log(`  Status: ${logEntry.status.toUpperCase()}`)

    if (alerts.length > 0) {
      console.log(`\n⚠️  ALERTS (${alerts.length}):`)
      alerts.forEach((alert) => {
        console.log(`  - ${alert.message}`)
      })
    }

    return NextResponse.json(logEntry)
  } catch (error) {
    console.error(`❌ Error fetching Core Web Vitals:`, (error as Error).message)
    return NextResponse.json(
      { 
        error: 'Failed to fetch Core Web Vitals',
        message: (error as Error).message 
      },
      { status: 500 }
    )
  }
}
