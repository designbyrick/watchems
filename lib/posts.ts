import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

// Organic-traffic posts live in content/posts/<slug>/index.mdx and are served at /learn/<slug>.
// The folder is the registry: a post exists when its folder exists. See .claude/skills/new-post.

export interface PostFact {
  // The exact text as it appears in the post, e.g. "41 mm" or "$5,400"
  value: string
  // What the value describes, e.g. "Omega Seamaster 300M case diameter"
  claim: string
  // URL of the page the value was read from (brand site first)
  source: string
  // YYYY-MM-DD the value was read
  checkedAt: string
}

export interface PostFaq {
  question: string
  answer: string
}

// /posts/<slug>.webp, drawn by scripts/post-image.mjs (OpenAI, paid) from `scene`.
// The scene never shows a real brand or model.
export interface PostCover {
  src: string
  alt: string
  scene: string
}

export interface PostCoverage {
  point: string
  sources: string[]
  section: string
}

export interface PostFrontmatter {
  // Page title without the " | Watchems" suffix the root layout adds
  title: string
  h1: string
  description: string
  // The main search this post answers, plus where and when it was researched
  query: { main: string; secondary: string[]; country: string; researchedAt: string }
  intent: 'how-to' | 'list' | 'comparison' | 'definition' | 'buying-advice' | 'problem'
  published: string
  updated?: string
  // Short label for the breadcrumb and the /learn index
  short: string
  takeaways: string[]
  faq: PostFaq[]
  facts: PostFact[]
  cover: PostCover
  // The main points of the top-ranked articles for the main search, and the H2 (or "FAQ") of this
  // post that covers each one. An empty section means the point is not covered yet.
  coverage: PostCoverage[]
  // AI illustrations used by <Figure> in the text, at /posts/<slug>/<name>.webp (same rules as the cover)
  figures?: PostCover[]
}

export interface Post extends PostFrontmatter {
  slug: string
  body: string
}

export const POSTS_DIR = path.join(process.cwd(), 'content', 'posts')
export const SITE = 'https://watchems.com'

export const postPath = (slug: string) => `/learn/${slug}`
export const postUrl = (slug: string) => `${SITE}${postPath(slug)}`

export const headingId = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// The H2s of a post, for the "On this page" list
export function postHeadings(body: string): Array<{ id: string; text: string }> {
  return Array.from(body.matchAll(/^##\s+(.+)$/gm)).map((m) => ({ id: headingId(m[1].trim()), text: m[1].trim() }))
}

export function readPost(slug: string): Post | undefined {
  const file = path.join(POSTS_DIR, slug, 'index.mdx')
  if (!fs.existsSync(file)) return undefined
  const { data, content } = matter(fs.readFileSync(file, 'utf8'))
  return { ...(data as PostFrontmatter), slug, body: content.trim() }
}

// Newest first
export function getAllPosts(): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return []
  return fs
    .readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => readPost(d.name))
    .filter((p): p is Post => Boolean(p))
    .sort((a, b) => b.published.localeCompare(a.published))
}
