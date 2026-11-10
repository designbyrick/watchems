/**
 * Paid image for a /learn post with the OpenAI Image API: the cover (from cover.scene) or, with
 * --figure <name>, an illustration inside the text (from the `figures` entry whose src is
 * /posts/<slug>/<name>.webp). Without --execute it only prints the prompt. An image that already
 * exists is skipped unless --force.
 *
 * Usage:
 *   node --env-file=.env.local scripts/post-image.mjs <slug> [--figure <name>] [--execute] [--force] [--quality high] [--max-usd 0.2]
 *
 * Every watch in the image is generic: no logo, no text, no shape copied from a real model.
 */

import matter from 'gray-matter'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// Current OpenAI image model (check the OpenAI docs before each run and update both lines).
// Docs checked 2026-10-30 in ZimSpeak. USD per 1M tokens.
const MODEL = 'gpt-image-2.5-flare'
const PRICE = { textIn: 5, imageIn: 8, imageOut: 30 }
const SIZE = { width: 1536, height: 864 }

// One look for every cover, so the posts read as one series and sit well beside the site's owner photos
const STYLE = [
  'Editorial still-life photograph for a watch reference website, natural soft daylight, shallow depth of field.',
  'Palette: off-white and pale slate background, deep navy and warm wood or leather tones, a small touch of muted gold.',
  'Any wristwatch in the image is generic and unbranded: plain dial with simple stick markers, no logo, no lettering,',
  'no numbers, no crown guards or bezel shapes copied from a real model. No text, letters, numbers, logos or brand names anywhere.',
  'Hands and wrists look natural, adult, realistic proportions.',
].join(' ')

const args = process.argv.slice(2)
const slug = args.find((a) => !a.startsWith('--'))
const flag = (n) => args.includes(`--${n}`)
const opt = (n) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 ? args[i + 1] : undefined
}
if (!slug) {
  console.error('Usage: scripts/post-image.mjs <slug> [--figure <name>] [--execute] [--force]')
  process.exit(1)
}

const mdx = join(ROOT, 'content', 'posts', slug, 'index.mdx')
if (!existsSync(mdx)) {
  console.error(`No post at ${mdx}`)
  process.exit(1)
}
const { data } = matter(readFileSync(mdx, 'utf8'))
const figure = opt('figure')
const src = figure ? `/posts/${slug}/${figure}.webp` : `/posts/${slug}.webp`
const scene = figure ? data.figures?.find((f) => f.src === src)?.scene : data.cover?.scene
if (!scene) {
  console.error(figure ? `The frontmatter needs a figures entry with src "${src}" and a scene` : 'The frontmatter needs a cover.scene')
  process.exit(1)
}

const out = join(ROOT, 'public', src)
if (existsSync(out) && !flag('force')) {
  console.log(`${out} exists (use --force to redo).`)
  process.exit(0)
}

const prompt = `${STYLE}\n\nScene: ${scene}`
const quality = opt('quality') ?? 'high'
const maxUsd = Number(opt('max-usd') ?? 0.2)

if (!flag('execute')) {
  console.log(`Dry run: ${MODEL}, ${SIZE.width}x${SIZE.height}, quality ${quality}. Pass --execute to make the paid call.\n\n${prompt}`)
  process.exit(0)
}
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set. Run with: node --env-file=.env.local ...')
  process.exit(1)
}

const res = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: MODEL, prompt, size: `${SIZE.width}x${SIZE.height}`, quality, output_format: 'webp', output_compression: 82, n: 1 }),
})
const body = await res.json()
if (!res.ok || !body.data?.[0]?.b64_json) {
  console.error(`Failed (${res.status}) ${body.error?.code ?? ''} ${body.error?.message ?? ''}`)
  process.exit(1)
}

const u = body.usage ?? {}
const cost =
  ((u.input_tokens_details?.text_tokens ?? u.input_tokens ?? 0) * PRICE.textIn +
    (u.input_tokens_details?.image_tokens ?? 0) * PRICE.imageIn +
    (u.output_tokens ?? 0) * PRICE.imageOut) / 1e6

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, Buffer.from(body.data[0].b64_json, 'base64'))
console.log(`Wrote ${out}: $${cost.toFixed(4)}${cost > maxUsd ? ` (over the $${maxUsd} cap: check the model price)` : ''}`)
