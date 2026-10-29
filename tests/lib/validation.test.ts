import { describe, expect, it } from 'vitest'
import {
  escapeLike,
  isValidSlug,
  isValidWatchKey,
  parseIntParam,
  sanitizeText,
  VOTABLE_GUIDE_SLUGS,
} from '@/lib/validation'

describe('isValidSlug', () => {
  it('accepts lowercase slugs', () => {
    expect(isValidSlug('omega-seamaster-300m')).toBe(true)
    expect(isValidSlug('a')).toBe(true)
  })

  it.each([
    ['empty', ''],
    ['uppercase', 'Omega'],
    ['leading hyphen', '-omega'],
    ['path traversal', '../etc'],
    ['slash', 'a/b'],
    ['space', 'a b'],
    ['percent', 'a%25'],
    ['too long', 'a'.repeat(122)],
  ])('rejects %s', (_label, value) => {
    expect(isValidSlug(value)).toBe(false)
  })

  it('allows up to 121 chars', () => {
    expect(isValidSlug('a'.repeat(121))).toBe(true)
  })
})

describe('sanitizeText', () => {
  it('trims, strips control characters and caps length', () => {
    expect(sanitizeText('  hi\x00\x1F\x7Fthere \n', 50)).toBe('hithere')
    expect(sanitizeText('abcdef', 3)).toBe('abc')
  })
})

describe('escapeLike', () => {
  it('escapes %, _ and backslash so they match literally', () => {
    expect(escapeLike('100%')).toBe('100\\%')
    expect(escapeLike('a_b')).toBe('a\\_b')
    expect(escapeLike('c:\\x')).toBe('c:\\\\x')
    expect(escapeLike('%_\\')).toBe('\\%\\_\\\\')
  })

  it('leaves ordinary text alone', () => {
    expect(escapeLike('rolex sub')).toBe('rolex sub')
  })
})

describe('parseIntParam', () => {
  it('returns null for missing, blank or non-numeric input', () => {
    expect(parseIntParam(null)).toBeNull()
    expect(parseIntParam('')).toBeNull()
    expect(parseIntParam('   ')).toBeNull()
    expect(parseIntParam('abc')).toBeNull()
    expect(parseIntParam('NaN')).toBeNull()
  })

  it('parses integers like parseInt', () => {
    expect(parseIntParam('42')).toBe(42)
    expect(parseIntParam('-3')).toBe(-3)
    expect(parseIntParam('12px')).toBe(12)
  })
})

describe('isValidWatchKey', () => {
  it('accepts brand:model in lowercase', () => {
    expect(isValidWatchKey('seiko:5 sports')).toBe(true)
  })

  it.each([
    ['empty', ''],
    ['no colon', 'seiko'],
    ['two colons', 'a:b:c'],
    ['empty brand', ':model'],
    ['blank model', 'brand: '],
    ['uppercase', 'Seiko:5'],
    ['control char', 'a:b\x00'],
    ['too long', `a:${'b'.repeat(120)}`],
  ])('rejects %s', (_label, value) => {
    expect(isValidWatchKey(value)).toBe(false)
  })
})

describe('VOTABLE_GUIDE_SLUGS', () => {
  it('only contains valid slugs', () => {
    for (const slug of Array.from(VOTABLE_GUIDE_SLUGS)) expect(isValidSlug(slug)).toBe(true)
  })
})
