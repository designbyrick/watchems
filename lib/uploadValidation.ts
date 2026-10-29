import { sanitizeText } from '@/lib/validation'

/** Reads an optional metadata field: trimmed, length-capped, with angle brackets stripped. */
export function metaField(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  if (typeof value !== 'string') return null
  return sanitizeText(value.replace(/[<>]/g, ''), 120) || null
}

/** Checks the file signature: JPEG, PNG, WebP or AVIF. The client-sent MIME type is not trusted. */
export function validateMagicBytes(buf: Buffer): boolean {
  // JPEG
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true
  // PNG
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true
  // WebP
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true
  // AVIF — ISOBMFF ftyp box: bytes 4–7 = 'ftyp', bytes 8–11 = 'avif' or 'avis'
  if (buf.length >= 12 &&
      buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70 &&
      ((buf[8] === 0x61 && buf[9] === 0x76 && buf[10] === 0x69 && buf[11] === 0x66) ||
       (buf[8] === 0x61 && buf[9] === 0x76 && buf[10] === 0x69 && buf[11] === 0x73))) return true
  return false
}
