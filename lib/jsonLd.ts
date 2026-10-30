/**
 * Serializes structured data for a `<script type="application/ld+json">` tag.
 *
 * JSON.stringify alone does not escape `<`, so user-supplied values (brand,
 * model, reference, userName) containing `</script>` would break out of the
 * tag and execute as HTML. Escaping `<`, `>` and `&` as unicode sequences
 * keeps the output valid JSON while making it inert inside a script element.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}
