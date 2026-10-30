import { describe, expect, it } from 'vitest'
import {
  deriveWatchId,
  normalizeBrand,
  normalizeModel,
  normalizeWatch,
  toWatchSlug,
} from '@/lib/normalizeWatch'

describe('toWatchSlug', () => {
  it('strips diacritics and non-alphanumerics', () => {
    expect(toWatchSlug('Hermétique')).toBe('hermetique')
    expect(toWatchSlug('Mühle-Glashütte')).toBe('muhle-glashutte')
    expect(toWatchSlug('  Omega / Seamaster 300M!  ')).toBe('omega-seamaster-300m')
  })
})

describe('normalizeBrand', () => {
  it('title-cases all-caps and all-lowercase brands', () => {
    expect(normalizeBrand('OMEGA')).toBe('Omega')
    expect(normalizeBrand('seiko')).toBe('Seiko')
    expect(normalizeBrand('grand seiko')).toBe('Grand Seiko')
  })

  it('keeps mixed-case brands as typed', () => {
    expect(normalizeBrand('TAG Heuer')).toBe('TAG Heuer')
    expect(normalizeBrand(' Hamilton ')).toBe('Hamilton')
  })

  it('returns empty for blank input', () => {
    expect(normalizeBrand('   ')).toBe('')
  })
})

describe('normalizeModel', () => {
  it('removes a repeated brand prefix', () => {
    expect(normalizeModel('Seiko 5 Sports', 'Seiko')).toBe('5 Sports')
    expect(normalizeModel('SEIKO 5 Sports', 'seiko')).toBe('5 Sports')
  })

  it('keeps the model when it only starts with the brand letters', () => {
    expect(normalizeModel('Seikomatic', 'Seiko')).toBe('Seikomatic')
  })

  it('keeps a model equal to the brand', () => {
    expect(normalizeModel('Seiko', 'Seiko')).toBe('Seiko')
  })
})

describe('normalizeWatch / deriveWatchId', () => {
  it('produces cleaned names and a canonical watchId', () => {
    expect(normalizeWatch('SEIKO', 'Seiko 5 Sports')).toEqual({
      brand: 'Seiko',
      model: '5 Sports',
      watchId: 'seiko-5-sports',
    })
    expect(deriveWatchId('OMEGA', 'Seamaster 300M')).toBe('omega-seamaster-300m')
  })
})
