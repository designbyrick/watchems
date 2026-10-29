export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import https from 'https'
import crypto from 'crypto'
import { getRedis } from '@/lib/redis'

/**
 * Google Search Console Metrics Cron Job
 * Runs weekly (Mondays at 03:00 UTC) via Vercel Cron Jobs (see vercel.json)
 * Fetches ranking metrics from GSC via service account
 * Stores metrics in Upstash Redis
 * Metrics: top keywords, average position, CTR, impressions
 */

const PROPERTY_URL = 'https://watchems.com/'
const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']

interface GoogleServiceAccount {
  private_key_id: string
  client_email: string
  private_key: string
}

interface GSCRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface GSCResponse {
  rows?: GSCRow[]
  error?: { message: string }
}

interface GSCEntry {
  timestamp: string
  totalClicks: number
  totalImpressions: number
  averagePosition: number
  averageCTR: number
  topQueries: Array<{
    query: string
    clicks: number
    impressions: number
    position: number
    ctr: number
  }>
}

/**
 * Parse service account from environment variable (JSON string or base64 encoded)
 */
function loadServiceAccount(): GoogleServiceAccount {
  const credentialSource = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

  if (!credentialSource) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set')
  }

  try {
    // Try parsing as JSON first
    return JSON.parse(credentialSource) as GoogleServiceAccount
  } catch {
    // Try parsing as base64
    try {
      const decoded = Buffer.from(credentialSource, 'base64').toString('utf8')
      return JSON.parse(decoded) as GoogleServiceAccount
    } catch {
      throw new Error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON. Must be valid JSON or base64-encoded JSON.')
    }
  }
}

/**
 * Generate JWT access token using service account
 */
async function getAccessToken(serviceAccount: GoogleServiceAccount): Promise<string> {
  return new Promise((resolve, reject) => {
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id,
    }

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: serviceAccount.client_email,
      scope: SCOPES.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }

    // Simple base64url encoding
    const headerStr = Buffer.from(JSON.stringify(header)).toString('base64url')
    const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const signingInput = `${headerStr}.${payloadStr}`

    // Sign with private key
    const signer = crypto.createSign('RSA-SHA256')
    signer.update(signingInput)
    const signature = signer.sign(serviceAccount.private_key, 'base64url')

    const jwt = `${signingInput}.${signature}`

    // Exchange JWT for access token
    const postData = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    })

    const options = {
      hostname: 'oauth2.googleapis.com',
      port: 443,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.toString().length,
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.error) {
            reject(new Error(`OAuth error: ${json.error_description}`))
          } else {
            resolve(json.access_token)
          }
        } catch (e) {
          reject(new Error(`Failed to parse OAuth response: ${(e as Error).message}`))
        }
      })
    })

    req.on('error', reject)
    req.write(postData.toString())
    req.end()
  })
}

/**
 * Fetch GSC metrics
 */
async function fetchGSCMetrics(accessToken: string): Promise<GSCResponse> {
  return new Promise((resolve, reject) => {
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const endDate = new Date()

    const payload = JSON.stringify({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['query'],
      rowLimit: 25000,
      startRow: 0,
    })

    const path = `/sites/${encodeURIComponent(PROPERTY_URL)}/searchAnalytics/query`
    const options = {
      hostname: 'www.googleapis.com',
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Authorization: `Bearer ${accessToken}`,
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error(`Failed to parse GSC response: ${(e as Error).message}`))
        }
      })
    })

    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

/**
 * Verify the cron secret. Vercel sends `Authorization: Bearer ${CRON_SECRET}`
 * automatically when the CRON_SECRET env var is set on the project.
 */
function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET
  if (!secret) {
    return process.env.NODE_ENV === 'development'
  }

  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(request.headers.get('authorization') ?? '')
  return received.length === expected.length && crypto.timingSafeEqual(received, expected)
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[${new Date().toISOString()}] Fetching GSC metrics for watchems.com...`)

    // Check if service account is configured
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      console.warn('GSC metrics: GOOGLE_SERVICE_ACCOUNT_JSON not configured. Skipping GSC fetch.')
      return NextResponse.json({
        status: 'skipped',
        message: 'GOOGLE_SERVICE_ACCOUNT_JSON environment variable not configured',
      })
    }

    const serviceAccount = loadServiceAccount()
    console.log(`Using service account: ${serviceAccount.client_email}`)

    const accessToken = await getAccessToken(serviceAccount)
    console.log('Access token obtained')

    const metrics: GSCResponse = await fetchGSCMetrics(accessToken)

    if (metrics.error) {
      throw new Error(`GSC API error: ${metrics.error.message}`)
    }

    // Store in Redis
    const redis = getRedis()
    if (redis) {
      const timestamp = new Date().toISOString()
      const rows = metrics.rows || []
      const totalClicks = rows.reduce((sum: number, row: GSCRow) => sum + row.clicks, 0)
      const totalImpressions = rows.reduce((sum: number, row: GSCRow) => sum + row.impressions, 0)
      const averagePosition = rows.reduce((sum: number, row: GSCRow) => sum + row.position, 0) / (rows.length || 1)
      const averageCTR = rows.reduce((sum: number, row: GSCRow) => sum + row.ctr, 0) / (rows.length || 1)
      
      const entry: GSCEntry = {
        timestamp,
        totalClicks,
        totalImpressions,
        averagePosition,
        averageCTR,
        topQueries: rows.slice(0, 20).map((row: GSCRow) => ({
          query: row.keys[0],
          clicks: row.clicks,
          impressions: row.impressions,
          position: parseFloat(row.position.toFixed(2)),
          ctr: parseFloat((row.ctr * 100).toFixed(2)),
        })),
      }

      // Store with expiration (90 days)
      await redis.set(`gsc:metrics:${timestamp}`, JSON.stringify(entry), { ex: 90 * 24 * 60 * 60 })
      await redis.set('gsc:metrics:latest', JSON.stringify(entry))

      console.log('✅ GSC metrics recorded in Redis')
      console.log(`Total Clicks (90d): ${entry.totalClicks}`)
      console.log(`Total Impressions (90d): ${entry.totalImpressions}`)
      console.log(`Average Position: ${entry.averagePosition.toFixed(2)}`)
      console.log(`Average CTR: ${(entry.averageCTR * 100).toFixed(4)}%`)

      return NextResponse.json(entry)
    } else {
      console.warn('Redis not available, metrics not persisted')
      return NextResponse.json({
        status: 'failed',
        message: 'Redis not available',
      })
    }
  } catch (error) {
    console.error(`❌ Error fetching GSC metrics:`, (error as Error).message)
    return NextResponse.json(
      {
        error: 'Failed to fetch GSC metrics',
        message: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
