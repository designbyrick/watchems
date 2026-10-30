export const dynamic = 'force-dynamic'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import sharp from 'sharp'
import { checkIdentifyRateLimit } from '@/lib/ratelimit'
import { checkAdmin } from '@/lib/admin'
import { ACCEPTED_TYPES } from '@/lib/photos'

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const MAX_IDENTIFY_SIZE = 8 * 1024 * 1024 // 8 MB

/** Check the file's magic bytes match its declared image MIME type. */
function hasValidImageSignature(bytes: Buffer, mimeType: string): boolean {
  switch (mimeType) {
    case 'image/jpeg':
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    case 'image/png':
      return bytes.length >= 8 &&
        bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    case 'image/webp':
      return bytes.length >= 12 &&
        bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
    case 'image/avif': {
      if (bytes.length < 12 || bytes.toString('ascii', 4, 8) !== 'ftyp') return false
      const brand = bytes.toString('ascii', 8, 12)
      return brand === 'avif' || brand === 'avis'
    }
    default:
      return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // AI identification is admin-only for now
    if (!checkAdmin(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { success } = await checkIdentifyRateLimit(userId)
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const photo = formData.get('photo')

    if (!photo || !(photo instanceof File)) {
      return NextResponse.json(
        { error: 'No photo provided' },
        { status: 400 }
      )
    }

    if (photo.size > MAX_IDENTIFY_SIZE) {
      return NextResponse.json(
        { error: 'Photo too large (max 8 MB)' },
        { status: 400 }
      )
    }

    const mimeType = photo.type
    if (!ACCEPTED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Unsupported image type' },
        { status: 400 }
      )
    }

    // Convert file to buffer, then to base64
    const buffer = await photo.arrayBuffer()
    const sharpBuffer = Buffer.from(buffer)

    if (!hasValidImageSignature(sharpBuffer, mimeType)) {
      return NextResponse.json(
        { error: 'File content does not match image type' },
        { status: 400 }
      )
    }

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
    return NextResponse.json(
      { error: 'identification failed' },
      { status: 500 }
    )
  }
}
