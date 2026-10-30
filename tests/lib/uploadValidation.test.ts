import { describe, expect, it } from 'vitest'
import { metaField, validateMagicBytes } from '@/lib/uploadValidation'

const bytes = (...b: number[]) => Buffer.from(b)
const ascii = (s: string) => Array.from(s).map((c) => c.charCodeAt(0))

describe('validateMagicBytes', () => {
  it('accepts JPEG, PNG, WebP and AVIF signatures', () => {
    expect(validateMagicBytes(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(true)
    expect(validateMagicBytes(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a))).toBe(true)
    expect(validateMagicBytes(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')))).toBe(true)
    expect(validateMagicBytes(bytes(0, 0, 0, 0x1c, ...ascii('ftypavif')))).toBe(true)
    expect(validateMagicBytes(bytes(0, 0, 0, 0x1c, ...ascii('ftypavis')))).toBe(true)
  })

  it('rejects other files', () => {
    expect(validateMagicBytes(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'))).toBe(false)
    expect(validateMagicBytes(Buffer.from('GIF89a......'))).toBe(false)
    expect(validateMagicBytes(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVE')))).toBe(false)
    expect(validateMagicBytes(bytes(0, 0, 0, 0x1c, ...ascii('ftypheic')))).toBe(false)
  })

  it('rejects truncated headers', () => {
    expect(validateMagicBytes(Buffer.alloc(0))).toBe(false)
    expect(validateMagicBytes(bytes(0xff, 0xd8))).toBe(false)
    expect(validateMagicBytes(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEB')))).toBe(false)
  })
})

describe('metaField', () => {
  const form = (entries: Record<string, string | Blob>) => {
    const fd = new FormData()
    for (const [k, v] of Object.entries(entries)) fd.append(k, v)
    return fd
  }

  it('trims and strips angle brackets', () => {
    expect(metaField(form({ brandName: '  <b>Omega</b> ' }), 'brandName')).toBe('bOmega/b')
  })

  it('caps length at 120', () => {
    expect(metaField(form({ x: 'a'.repeat(500) }), 'x')).toHaveLength(120)
  })

  it('returns null for missing, empty or file values', () => {
    expect(metaField(form({}), 'x')).toBeNull()
    expect(metaField(form({ x: '   ' }), 'x')).toBeNull()
    expect(metaField(form({ x: new Blob(['hi']) }), 'x')).toBeNull()
  })
})
