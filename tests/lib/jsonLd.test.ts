import { describe, expect, it } from 'vitest'
import { serializeJsonLd } from '@/lib/jsonLd'

describe('serializeJsonLd', () => {
  const payload = {
    '@type': 'Product',
    name: 'Evil</script><script>alert(1)</script>',
    brand: 'A & B <Co>',
  }

  it('never emits a raw </script> or angle brackets', () => {
    const out = serializeJsonLd(payload)
    expect(out).not.toMatch(/<\/script/i)
    expect(out).not.toMatch(/[<>&]/)
    expect(out).toContain('\\u003c/script\\u003e')
  })

  it('still round-trips via JSON.parse', () => {
    expect(JSON.parse(serializeJsonLd(payload))).toEqual(payload)
  })

  it('leaves plain data unchanged', () => {
    expect(serializeJsonLd({ a: 1, b: 'x' })).toBe('{"a":1,"b":"x"}')
  })
})
