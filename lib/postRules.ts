import { postHeadings, type Post } from './posts'

// Writing rules every /learn post must pass. Pure functions so tests/lib/posts.test.ts can run
// them on real posts and on broken fixtures. Each returns a list of problems; empty means pass.

export const TITLE_SUFFIX = ' | Watchems'

export const HYPE_WORDS = [
  'unlock', 'unleash', 'seamless', 'seamlessly', 'elevate', 'elevated', 'journey', 'leverage',
  'game-changer', 'game changer', 'revolutionary', 'revolutionize', 'ultimate', 'must-have',
  'stunning', 'breathtaking', 'iconic', 'legendary', 'timeless masterpiece', 'delve', 'dive into',
  'in today\'s world', 'look no further', 'second to none', 'best-in-class', 'cutting-edge',
  'next level', 'next-level', 'effortlessly', 'boasts', 'nestled', 'tapestry', 'testament to',
  'grail', 'holy grail',
]

// Watch words a beginner may not know. The first use must be explained in the same sentence.
export const JARGON = [
  'lug-to-lug', 'lugs', 'lume', 'bezel', 'crown', 'caseback', 'chronometer', 'chronograph',
  'complication', 'in-house', 'microbrand', 'homage', 'beater', 'hacking', 'quickset',
  'power reserve', 'end link', 'end links', 'clasp', 'shroud', 'rehaut', 'applied indices',
]

// Capitalised words that are names or numerals, not jargon
const ACRONYM_ALLOW = new Set(['US', 'USA', 'UK', 'EU', 'IWC', 'TAG', 'OK', 'TV', 'FAQ', 'II', 'III', 'IV', 'VI'])

// Numbers with a unit: these are facts and must be listed in the post's `facts`
const FACT_NUMBER = /\$\d[\d,]*(?:\.\d+)?|\b\d+(?:\.\d+)?\s?(?:mm|m|meters|metres|ft|feet|inches|in|%|hours|jewels|bph|g|grams|atm|bar)\b/g

const INTERNAL_LINK = /\]\((\/(?:learn|buying-guide|buying-guides|brand|style|styles|w|watches)\b[^)\s]*)\)|href="(\/(?:learn|buying-guide|buying-guides|brand|style|styles|w|watches)\b[^"]*)"/g

export const normalizeFact = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()

// The words a reader sees: body without code, JSX tags, link URLs and headings markers
export function proseOf(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[A-Z][^>]*\/>/g, ' ')
    .replace(/<\/?[A-Za-z][^>]*>/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/[[\]]/g, '')
}

// Prose paragraphs (no headings, lists or JSX), for length and mention checks
export function paragraphsOf(body: string): string[] {
  return proseOf(body)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('#') && !/^[-*|>]|^\d+\./.test(p))
}

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?:])\s+|\n+/).map((s) => s.trim()).filter(Boolean)
}

// All visible text, for checks that cover the whole page
function allText(p: Post): string {
  return [
    p.title, p.h1, p.description, ...p.takeaways,
    ...p.faq.flatMap((f) => [f.question, f.answer]),
    proseOf(p.body),
  ].join('\n')
}

export function checkMeta(p: Post): string[] {
  const out: string[] = []
  const full = p.title + TITLE_SUFFIX
  if (full.length < 30 || full.length > 60) out.push(`title with suffix is ${full.length} chars, needs 30 to 60`)
  if (p.description.length < 70 || p.description.length > 160) out.push(`description is ${p.description.length} chars, needs 70 to 160`)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) || /\b20\d\d\b/.test(p.slug)) out.push('slug must be kebab-case with no year')
  for (const d of [p.published, p.updated, p.query?.researchedAt].filter((x) => x !== undefined)) {
    if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) out.push(`date "${String(d)}" must be a quoted YYYY-MM-DD string`)
  }
  if (!p.query?.main) out.push('query.main is missing')
  if (p.takeaways.length < 3 || p.takeaways.length > 5) out.push('needs 3 to 5 takeaways')
  if (p.faq.length < 3) out.push('needs at least 3 FAQ entries from real searches')
  return out
}

export function checkLinks(p: Post): string[] {
  const links = Array.from(p.body.matchAll(INTERNAL_LINK)).map((m) => m[1] ?? m[2])
  const out: string[] = []
  if (links.length < 2) out.push('needs at least 2 internal links (/learn, /buying-guide, /brand, /style, /w)')
  if (links.some((l) => l === `/learn/${p.slug}`)) out.push('links to itself')
  if (/\]\((?:#|https?:\/\/(?:www\.)?example\.com)[^)]*\)|href="(?:#|TODO)"|TODO|PLACEHOLDER/i.test(p.body)) {
    out.push('has a placeholder link or TODO')
  }
  if (/[«»]/.test(JSON.stringify(p))) out.push('still has a «...» marker from the template')
  return out
}

export function checkStyle(p: Post): string[] {
  const out: string[] = []
  const text = allText(p)
  const lower = text.toLowerCase()
  for (const w of HYPE_WORDS) {
    if (new RegExp(`\\b${w.replace(/[-']/g, '[-\' ]')}\\b`, 'i').test(lower)) out.push(`hype word: "${w}"`)
  }
  if (/[—–]|\s--\s/.test(text)) out.push('uses a dash (em dash, en dash or "--"); use a period, comma, colon or "to"')
  for (const para of paragraphsOf(p.body)) {
    const words = para.split(/\s+/).length
    if (words > 90) out.push(`paragraph over 90 words (${words}): "${para.slice(0, 60)}..."`)
    const openings = sentences(para).map((s) => s.split(' ')[0].toLowerCase())
    for (let i = 2; i < openings.length; i++) {
      if (openings[i] === openings[i - 1] && openings[i] === openings[i - 2]) {
        out.push(`three sentences in a row start with "${openings[i]}": "${para.slice(0, 60)}..."`)
        break
      }
    }
  }
  if (/\b(?:have you ever|are you tired of|imagine a world)\b/i.test(text)) out.push('fake hook question')
  return [...out, ...checkVoice(p)]
}

// Watchems writes as its own expert: no pointing at other guides, and no naming the sites used as research
const META_PHRASES = /\b(?:most|other|many|some) (?:guides|charts|articles|sites|websites|size charts)\b|\bthis (?:guide|article|post)\b|\baccording to\b|\b[A-Z][\w&]*'s (?:own )?(?:size|sizing|fit) guide\b/i

export function checkVoice(p: Post): string[] {
  const out: string[] = []
  const text = allText(p)
  const meta = text.match(META_PHRASES)
  if (meta) out.push(`points at other guides ("${meta[0]}"); write as the Watchems expert instead`)
  const sites = new Set(
    (p.coverage ?? []).flatMap((c) => c.sources).map((u) => {
      try { return new URL(u).hostname.replace(/^www\./, '').split('.')[0].replace(/-/g, ' ') } catch { return '' }
    }).filter((s) => s.length > 2),
  )
  for (const s of Array.from(sites)) {
    if (new RegExp(`\\b${s}\\b`, 'i').test(text)) out.push(`names "${s}", a site used as research; the post is Watchems' own work`)
  }
  return out
}

const explained = (sentence: string, term: string) => {
  const t = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return (
    new RegExp(`${t}\\s*\\(([^)]+\\s[^)]+)\\)`, 'i').test(sentence) ||
    new RegExp(`\\(\\s*${t}\\s*\\)`, 'i').test(sentence) ||
    new RegExp(`${t}s?,?\\s+(?:means|meaning|stands for|short for|which is|is the|are the|is a|are)\\b`, 'i').test(sentence) ||
    new RegExp(`${t}s?\\s*[,:]\\s*(?:the|a|an)\\s`, 'i').test(sentence)
  )
}

// Every acronym and jargon word is explained the first time it appears
export function checkPlainWords(p: Post): string[] {
  const out: string[] = []
  const body = sentences(proseOf(p.body).replace(/^#+\s.*$/gm, ' '))
  const seen = new Set<string>()
  for (const s of body) {
    for (const m of Array.from(s.matchAll(/\b[A-Z]{2,6}s?\b/g))) {
      const acr = m[0].replace(/s$/, '')
      if (ACRONYM_ALLOW.has(acr) || seen.has(acr)) continue
      seen.add(acr)
      if (!explained(s, acr)) out.push(`acronym "${acr}" is not explained in the sentence where it first appears`)
    }
    for (const term of JARGON) {
      if (seen.has(term)) continue
      if (!new RegExp(`\\b${term}\\b`, 'i').test(s)) continue
      seen.add(term)
      if (!explained(s, term)) out.push(`term "${term}" is not explained in the sentence where it first appears`)
    }
  }
  return out
}

// Every number with a unit must come from the facts list, and every fact needs a source
export function checkFacts(p: Post): string[] {
  const out: string[] = []
  const known = new Set(p.facts.map((f) => normalizeFact(f.value)))
  for (const f of p.facts) {
    if (!/^https:\/\/\S+/.test(f.source)) out.push(`fact "${f.value}" needs the https:// URL it was read from`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f.checkedAt))) out.push(`fact "${f.value}" needs checkedAt as YYYY-MM-DD`)
  }
  const text = [...p.takeaways, ...p.faq.map((f) => f.answer), proseOf(p.body)].join('\n')
  for (const m of Array.from(text.matchAll(FACT_NUMBER))) {
    if (!known.has(normalizeFact(m[0]))) out.push(`"${m[0]}" is not in facts (add it with its source)`)
  }
  return Array.from(new Set(out))
}

// 2 to 3 short Watchems mentions in the middle of the text, never in the opening paragraph
export function checkMentions(p: Post): string[] {
  const paras = paragraphsOf(p.body)
  const out: string[] = []
  if (paras[0] && /watchems/i.test(paras[0])) out.push('opening paragraph mentions Watchems')
  const n = paras.slice(1).filter((x) => /watchems/i.test(x)).length
  if (n < 2 || n > 3) out.push(`${n} paragraphs mention Watchems, needs 2 to 3`)
  return out
}

// Brands a cover must never name (a real brand in an AI image is a trademark risk)
const COMMON_BRANDS = [
  'rolex', 'omega', 'tudor', 'seiko', 'grand seiko', 'casio', 'g-shock', 'citizen', 'orient', 'tissot', 'longines',
  'cartier', 'patek', 'audemars', 'vacheron', 'breitling', 'tag heuer', 'heuer', 'iwc', 'panerai', 'hamilton',
  'oris', 'zenith', 'jaeger', 'hublot', 'swatch', 'timex', 'bulova', 'sinn', 'nomos', 'baltic', 'christopher ward',
]

export function checkCover(p: Post): string[] {
  const c = p.cover
  if (!c) return ['cover is missing']
  const out: string[] = []
  if (c.src !== `/posts/${p.slug}.webp`) out.push(`cover.src must be "/posts/${p.slug}.webp"`)
  if (!c.alt || c.alt.length < 15) out.push('cover.alt must describe what the image shows')
  if (!c.scene || c.scene.length < 40) out.push('cover needs a concrete scene from the post')
  const said = COMMON_BRANDS.filter((b) => new RegExp(`\\b${b}\\b`, 'i').test(`${c.scene} ${c.alt}`))
  if (said.length) out.push(`cover names a real brand (${said.join(', ')}); AI images show generic watches only`)
  return out
}

// The <Figure> images inside the text: /posts/<slug>/<name>.svg (diagram) or .webp (AI, with a scene)
export function figureSrcs(body: string): string[] {
  return Array.from(body.matchAll(/<Figure\b[^>]*\bsrc="([^"]+)"/g)).map((m) => m[1])
}

export function checkFigures(p: Post): string[] {
  const out: string[] = []
  for (const tag of Array.from(p.body.matchAll(/<Figure\b[^>]*>/g)).map((m) => m[0])) {
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1] ?? ''
    if (!new RegExp(`^/posts/${p.slug}/[a-z0-9-]+\\.(svg|webp)$`).test(src)) out.push(`figure src "${src}" must be /posts/${p.slug}/<name>.svg or .webp`)
    if ((tag.match(/\balt="([^"]*)"/)?.[1] ?? '').length < 15) out.push(`figure "${src}" needs an alt that describes it`)
    if (src.endsWith('.webp')) {
      const f = p.figures?.find((x) => x.src === src)
      if (!f || f.scene.length < 40) out.push(`figure "${src}" needs a figures entry with a concrete scene`)
      const said = f ? COMMON_BRANDS.filter((b) => new RegExp(`\\b${b}\\b`, 'i').test(f.scene)) : []
      if (said.length) out.push(`figure "${src}" scene names a real brand (${said.join(', ')})`)
    }
  }
  return out
}

// Every main point of the top-ranked articles is covered by a section of this post
export function checkCoverage(p: Post): string[] {
  const out: string[] = []
  const cov = p.coverage ?? []
  const sources = new Set(cov.flatMap((c) => c.sources))
  if (cov.length < 6) out.push(`coverage lists ${cov.length} points from the top-ranked articles, needs at least 6`)
  if (sources.size < 3) out.push(`coverage cites ${sources.size} top-ranked URLs, needs at least 3`)
  const h2 = postHeadings(p.body).map((h) => h.text)
  for (const c of cov) {
    if (!c.sources?.length || c.sources.some((s) => !/^https:\/\/\S+/.test(s))) out.push(`coverage "${c.point}" needs the https:// URLs of the articles that cover it`)
    if (!c.section) out.push(`coverage "${c.point}" is not covered by any section yet`)
    else if (c.section !== 'FAQ' && !h2.includes(c.section)) out.push(`coverage "${c.point}" points to "${c.section}", which is not an H2 of the post`)
  }
  return out
}

export function checkPost(p: Post): string[] {
  return [checkMeta, checkCover, checkCoverage, checkFigures, checkLinks, checkStyle, checkPlainWords, checkFacts, checkMentions].flatMap((f) => f(p))
}
