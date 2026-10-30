export const dynamic = 'force-dynamic'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import sharp from 'sharp'
import { checkIdentifyRateLimit } from '@/lib/ratelimit'

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { success } = await checkIdentifyRateLimit(userId)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.', code: 'rate_limited' },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const photo = formData.get('photo') as File

    if (!photo) {
      return NextResponse.json(
        { error: 'No photo provided' },
        { status: 400 }
      )
    }

    // Convert file to buffer, then to base64
    const buffer = await photo.arrayBuffer()
    const sharpBuffer = Buffer.from(buffer)
    const base64 = sharpBuffer.toString('base64')

    // Layer 1: EXIF check — real photos almost always have EXIF metadata
    let hasCamera = false
    try {
      const metadata = await sharp(sharpBuffer).metadata()
      hasCamera = !!(metadata.exif)
    } catch {
      // If sharp fails to read metadata, default to false
      hasCamera = false
    }

    // Determine MIME type
    const mimeType = photo.type || 'image/jpeg'

    // Call Gemini 2.5 Flash to identify the watch
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64,
        },
      },
      {
        text: `You are an expert watch identifier. Your job is to identify the exact watch model from a photo.

STEP 1 — READ DIAL TEXT FIRST (highest confidence signal):
Look very carefully for any text printed on the dial: brand name, model name, "Submariner", "Speedmaster", "Datejust", "Seamaster", "Explorer", reference numbers, calibre numbers, depth ratings, etc. Text on the dial is the most reliable identification signal.

STEP 2 — READ CASE / CASEBACK TEXT:
Look for engravings or text on the case sides, crown guards, or visible caseback.

STEP 3 — VISUAL FEATURES:
Use case shape, bezel type/markings, crown position/guards, dial color/texture, indices style, hand style, bracelet/strap type to narrow down candidates.

STEP 4 — IDENTIFY, then RETURN JSON ONLY:

{
  "isWatch": true or false,
  "isAiGenerated": true or false,
  "candidates": [
    {
      "brand": "exact brand name as printed on dial",
      "model": "exact model name/line (e.g. Submariner, Speedmaster Professional)",
      "reference": "reference number if visible or reliably known (e.g. 116610LN), else null",
      "movement": "Automatic|Manual|Quartz|Digital or null",
      "caseSize": "numeric mm only, no unit (e.g. 40), or null",
      "lugToLug": "numeric mm only, no unit (e.g. 47), or null",
      "betweenLugs": "numeric mm only, no unit (e.g. 20), or null",
      "thickness": "numeric mm only, no unit (e.g. 12.5), or null",
      "waterResistance": "numeric meters only, no unit (e.g. 300), or null",
      "estimatedPrice": "numeric USD only, no symbol (e.g. 9500), or null",
      "wristSize": null,
      "dialColor": "dominant dial color as seen (e.g. black, white, blue, green, silver, champagne, gray), or null",
      "bezelColor": "bezel color/insert (e.g. black, blue, blue-red, black-green, silver, none), or null",
      "caseMaterial": "case material (e.g. stainless steel, titanium, gold, rose gold, ceramic, plastic), or null",
      "strapType": "strap/bracelet type (e.g. steel bracelet, leather, rubber, NATO, mesh), or null",
      "watchStyle": "primary category (e.g. diver, dress, field, pilot, chronograph, GMT, casual, digital), or null",
      "confidence": "high|medium|low",
      "reasoning": "one sentence: which visual or text cues led to this identification"
    }
  ]
}

Rules:
1. If isWatch=false, return candidates as empty array [].
2. If isWatch=true, return up to 3 candidates ranked by confidence. First candidate must be your best guess.
3. confidence="high" only when you can read brand/model text on the dial clearly. confidence="medium" for strong visual match without readable text. confidence="low" for speculative.
4. isAiGenerated=true only for renders/CGI. Real photos with studio lighting are still real. EXIF hint: hasCamera=${hasCamera}.
5. All numeric spec fields: return numeric string only, NO units. Return null if genuinely unknown.
6. No markdown, no explanation — JSON only.`,
      },
    ])

    const text = result.response.text()

    // Parse the JSON response
    let responseData
    try {
      // Extract JSON from the response (may contain markdown code blocks or extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return NextResponse.json({
          error: 'Failed to parse response',
        })
      }
      responseData = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({
        error: 'Failed to parse identification response',
      })
    }

    return NextResponse.json(responseData)
  } catch (error: unknown) {
    console.error('Watch identification error:', error)
    // Upstream Gemini problems (no credits, quota, overload) → AI unavailable
    const upstreamStatus = (error as { status?: number })?.status
    if (upstreamStatus && [402, 403, 429, 500, 503].includes(upstreamStatus)) {
      return NextResponse.json(
        { error: 'AI identification is unavailable', code: 'ai_unavailable' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'identification failed' },
      { status: 500 }
    )
  }
}
