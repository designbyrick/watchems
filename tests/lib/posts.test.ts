import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { getAllPosts, postPath, type Post } from '@/lib/posts'
import {
  checkCover, checkCoverage, checkVoice, checkFacts, checkFigures, figureSrcs, checkLinks, checkMentions, checkMeta, checkPlainWords, checkPost, checkStyle,
} from '@/lib/postRules'

const ROOT = process.cwd()
const read = (f: string) => (fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '')

// A post that passes every rule. Each test below breaks one thing.
const good: Post = {
  slug: 'how-big-a-watch-looks-on-your-wrist',
  title: 'How Big a Watch Looks on Your Wrist',
  h1: 'How big a watch looks on your wrist',
  short: 'Watch size',
  description: 'Case size alone does not tell you how a watch fits. Here is the number to check and how to measure your wrist.',
  query: { main: 'how big should a watch be', secondary: [], country: 'US', researchedAt: '2026-11-02' },
  intent: 'how-to',
  published: '2026-11-02',
  takeaways: ['Check the length of the case, not only its width.', 'Measure your wrist with a paper strip.', 'Compare owner photos before you buy.'],
  faq: [
    { question: 'Is a big watch rude at work?', answer: 'No. Fit matters more than size.' },
    { question: 'Can I wear a large watch on a small wrist?', answer: 'Yes, if the case does not hang over the edges.' },
    { question: 'What should I measure first?', answer: 'Your wrist, with a strip of paper.' },
  ],
  facts: [
    { value: '40 mm', claim: 'example case width', source: 'https://www.omegawatches.com/watches/seamaster/diver-300m', checkedAt: '2026-11-02' },
    { value: '50 mm', claim: 'Seamaster 300M lug-to-lug', source: 'https://www.omegawatches.com/watches/seamaster/diver-300m', checkedAt: '2026-11-02' },
    { value: '$500', claim: 'buying guide tier', source: 'https://watchems.com/buying-guide/under-500', checkedAt: '2026-11-02' },
  ],
  coverage: [
    { point: 'How to measure your wrist', sources: ['https://a.example/guide'], section: 'How to measure your wrist' },
    { point: 'Lug-to-lug explained', sources: ['https://b.example/guide'], section: 'Why case size is not the whole story' },
    { point: 'Case diameter explained', sources: ['https://a.example/guide', 'https://c.example/guide'], section: 'Why case size is not the whole story' },
    { point: 'Case thickness', sources: ['https://c.example/guide'], section: 'Why case size is not the whole story' },
    { point: 'Wrist size to case size', sources: ['https://a.example/guide'], section: 'How to measure your wrist' },
    { point: 'Is a big watch too big', sources: ['https://b.example/guide'], section: 'FAQ' },
  ],
  cover: {
    src: '/posts/how-big-a-watch-looks-on-your-wrist.webp',
    alt: 'A paper strip around a wrist beside a plain watch',
    scene: 'A hand wraps a strip of paper around a wrist on a wooden desk, a plain unbranded watch lies beside it.',
  },
  body: [
    'A 40 mm watch can look small or large depending on one number on the spec sheet. Here is how to read it.',
    '## Why case size is not the whole story',
    'Lug-to-lug (the distance from the top tip of the case to the bottom tip) decides whether a watch hangs over your wrist. The [Omega Seamaster 300M](/w/omega-seamaster-300m) measures 50 mm this way.',
    'Owner photos on Watchems show the same watch on small and large wrists, so you can compare before you buy.',
    '## How to measure your wrist',
    'Wrap a strip of paper around your wrist, mark it, and measure it flat. Then read the [under $500 guide](/buying-guide/under-500) with your number in mind.',
    'Each wrist size in the Watchems gallery comes from the owner, so you can find a wrist like yours.',
  ].join('\n\n'),
}

const withBody = (body: string): Post => ({ ...good, body })

describe('post rules', () => {
  it('pass a well-formed post', () => {
    expect(checkPost(good)).toEqual([])
  })

  it('reject a title or description of the wrong length', () => {
    expect(checkMeta({ ...good, title: 'A title that is far too long for a search result page' })).not.toEqual([])
    expect(checkMeta({ ...good, description: 'Too short.' })).not.toEqual([])
  })

  it('reject a post without internal links', () => {
    expect(checkLinks(withBody(good.body.replace(/\]\([^)]*\)/g, ']')))).not.toEqual([])
  })

  it('reject hype words', () => {
    expect(checkStyle(withBody(`${good.body}\n\nThis strap is a game-changer.`))).not.toEqual([])
  })

  it('reject dashes', () => {
    expect(checkStyle(withBody(`${good.body}\n\nIt fits well — even on a small wrist.`))).not.toEqual([])
    expect(checkStyle({ ...good, description: `${good.description.slice(0, 80)} – fit guide.` })).not.toEqual([])
  })

  it('reject a paragraph over 90 words', () => {
    expect(checkStyle(withBody(`${good.body}\n\n${'word '.repeat(95).trim()}.`))).not.toEqual([])
  })

  it('reject an acronym or jargon word without an explanation in the same sentence', () => {
    expect(checkPlainWords(withBody(`${good.body}\n\nIt has a COSC movement.`))).not.toEqual([])
    expect(checkPlainWords(withBody(`${good.body}\n\nThe bezel turns one way.`))).not.toEqual([])
    expect(checkPlainWords(withBody(`${good.body}\n\nIt is COSC (tested for accuracy by a Swiss lab) certified.`))).toEqual([])
  })

  it('reject a number that is not in the facts list', () => {
    expect(checkFacts(withBody(`${good.body}\n\nIt is 12 mm thick.`))).not.toEqual([])
    expect(checkFacts({ ...good, facts: [{ ...good.facts[0], source: 'db:photos' }, ...good.facts.slice(1)] })).not.toEqual([])
  })

  it('need 2 to 3 Watchems mentions, none in the opening paragraph', () => {
    expect(checkMentions(withBody(good.body.replace(/Watchems/g, 'the site')))).not.toEqual([])
    expect(checkMentions(withBody(`Watchems says hi.\n\n${good.body}`))).not.toEqual([])
  })

  it('need every main point of the top-ranked articles covered by a section', () => {
    expect(checkCoverage({ ...good, coverage: good.coverage.slice(0, 3) })).not.toEqual([])
    expect(checkCoverage({ ...good, coverage: [...good.coverage, { point: 'Bracelet vs strap', sources: ['https://a.example/guide'], section: '' }] })).not.toEqual([])
    expect(checkCoverage({ ...good, coverage: [...good.coverage, { point: 'Dial color', sources: ['https://a.example/guide'], section: 'A heading that does not exist' }] })).not.toEqual([])
  })

  it('reject pointing at other guides or naming a research site', () => {
    expect(checkVoice(withBody(`${good.body}\n\nMost guides skip this step.`))).not.toEqual([])
    expect(checkVoice(withBody(`${good.body}\n\nShinola's size guide says to divide by three.`))).not.toEqual([])
    const research = { ...good, coverage: [...good.coverage, { point: 'Dial color', sources: ['https://paul-rich.com/blogs/news/watch-size-guide'], section: 'FAQ' }] }
    expect(checkVoice({ ...research, body: `${good.body}\n\nPaul Rich likes this trick.` })).not.toEqual([])
    expect(checkVoice(good)).toEqual([])
  })

  it('reject a figure outside the post folder, without alt, or an AI figure without a scene', () => {
    const fig = (tag: string) => withBody(`${good.body}\n\n${tag}`)
    expect(checkFigures(fig(`<Figure src="/posts/${good.slug}/wrist.svg" alt="A diagram of a wrist seen in a slice" />`))).toEqual([])
    expect(checkFigures(fig('<Figure src="/posts/other/wrist.svg" alt="A diagram of a wrist seen in a slice" />'))).not.toEqual([])
    expect(checkFigures(fig(`<Figure src="/posts/${good.slug}/wrist.svg" alt="Wrist" />`))).not.toEqual([])
    expect(checkFigures(fig(`<Figure src="/posts/${good.slug}/desk.webp" alt="A plain watch on a narrow wrist" />`))).not.toEqual([])
  })

  it('reject a cover that names a real brand', () => {
    expect(checkCover({ ...good, cover: { ...good.cover, scene: 'A Rolex Submariner on a wooden desk next to a strip of paper.' } })).not.toEqual([])
  })
})

describe('published posts', () => {
  const posts = getAllPosts()
  const backlog = read('docs/seo/backlog.md')
  const home = read('app/page.tsx')

  it('pass every writing rule', () => {
    for (const p of posts) expect(checkPost(p), p.slug).toEqual([])
  })

  it('have a cover file on disk', () => {
    for (const p of posts) expect(fs.existsSync(path.join(ROOT, 'public', p.cover.src)), `${p.slug}: missing ${p.cover.src}`).toBe(true)
  })

  it('have every figure file on disk', () => {
    for (const p of posts) {
      for (const src of figureSrcs(p.body)) expect(fs.existsSync(path.join(ROOT, 'public', src)), `${p.slug}: missing ${src}`).toBe(true)
    }
  })

  it('are listed in docs/seo/backlog.md', () => {
    for (const p of posts) {
      const line = backlog.split('\n').find((l) => l.includes(`\`${postPath(p.slug)}\``))
      expect(line && /\| (rascunho|publicada) \|/.test(line), `${p.slug}: add it to the backlog as rascunho or publicada`).toBe(true)
    }
  })

  it('do not compete with a buying guide or with each other', () => {
    const mains = posts.map((p) => p.query.main.toLowerCase().trim())
    for (const [i, q] of mains.entries()) {
      expect(/\bbest\b.*\bwatch(es)?\b.*\b(under|below)\b\s*\$?\d/.test(q), `${posts[i].slug}: "${q}" belongs to /buying-guide`).toBe(false)
      expect(mains.indexOf(q), `${posts[i].slug}: "${q}" is already another post's main search`).toBe(i)
    }
  })

  it('use affiliate links only after the site stops saying it has none', () => {
    for (const p of posts) {
      if (!/<Affiliate\b/.test(p.body)) continue
      expect(/no affiliate links/i.test(home), `${p.slug}: app/page.tsx still says "no affiliate links"`).toBe(false)
    }
  })
})
