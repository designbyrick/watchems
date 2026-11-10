/**
 * Organic-traffic post — /learn/<slug>
 * Content lives in content/posts/<slug>/index.mdx (lib/posts.ts). Built with .claude/skills/new-post.
 */

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { FaqAccordion } from '@/components/guide/FaqAccordion'
import PostMdx, { usesAffiliate } from '@/components/post/PostMdx'
import { getAllPosts, postHeadings, postPath, postUrl, readPost } from '@/lib/posts'
import { serializeJsonLd } from '@/lib/jsonLd'

interface Props {
  params: Promise<{ slug: string }>
}

const mono = 'font-mono uppercase tracking-[1px]'

const formatDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const post = readPost(slug)
  if (!post) return { title: 'Not Found' }
  const url = postUrl(slug)
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: 'article',
      siteName: 'Watchems',
      publishedTime: post.published,
      modifiedTime: post.updated ?? post.published,
      images: [post.cover.src],
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description },
  }
}

export default async function LearnPostPage(props: Props) {
  const { slug } = await props.params
  const post = readPost(slug)
  if (!post) notFound()

  const url = postUrl(slug)
  const headings = postHeadings(post.body)
  const related = getAllPosts().filter((p) => p.slug !== slug).slice(0, 4)

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.h1,
    description: post.description,
    url,
    image: `https://watchems.com${post.cover.src}`,
    datePublished: post.published,
    dateModified: post.updated ?? post.published,
    author: { '@type': 'Organization', name: 'Watchems Editorial', url: 'https://watchems.com' },
    publisher: { '@type': 'Organization', name: 'Watchems', url: 'https://watchems.com' },
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://watchems.com' },
      { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://watchems.com/learn' },
      { '@type': 'ListItem', position: 3, name: post.short, item: url },
    ],
  }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: post.faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }

  const tocLink = 'block py-2.5 text-sm text-muted border-b border-line hover:text-ink transition-colors'
  const toc = (
    <ol>
      {headings.map((h) => (
        <li key={h.id}><a href={`#${h.id}`} className={tocLink}>{h.text}</a></li>
      ))}
      {post.faq.length > 0 && <li><a href="#faq" className={tocLink}>Common questions</a></li>}
    </ol>
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
      {post.faq.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }} />}

      <div className="max-w-[1320px] mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-16 sm:pb-20">
        <nav aria-label="Breadcrumb" className={`flex gap-2 ${mono} text-xs text-muted`}>
          <Link href="/learn" className="hover:text-ink transition-colors">Learn</Link>
          <span aria-hidden="true">/</span>
          <span className="text-ink" aria-current="page">{post.short}</span>
        </nav>

        <header className="mt-[18px] grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:items-end">
          <div className="max-w-[760px]">
            <h1 className="font-heading text-[36px] sm:text-[56px] leading-[1.04] font-semibold tracking-display text-ink">{post.h1}</h1>
            <p className="mt-[18px] text-[17px] sm:text-[19px] leading-normal text-muted">{post.description}</p>
            <p className={`mt-5 ${mono} text-[11px] text-muted`}>
              Watchems Editorial · {post.updated ? `Updated ${formatDate(post.updated)}` : formatDate(post.published)}
            </p>
          </div>
          <div className="relative aspect-[16/9] rounded-[10px] overflow-hidden bg-subtle">
            <Image src={post.cover.src} alt={post.cover.alt} fill priority sizes="(max-width: 1024px) 100vw, 520px" className="object-cover" />
          </div>
        </header>

        <div className="mt-8 lg:mt-12 lg:flex lg:gap-12 lg:items-start">
          <details className="lg:hidden mb-8 rounded-[10px] border border-line bg-surface px-4 group">
            <summary className={`cursor-pointer list-none flex items-center justify-between py-3.5 ${mono} text-[11px] text-muted`}>
              On this page
              <svg className="w-4 h-4 transition-transform group-open:rotate-180" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="pb-2 [&_li:last-child_a]:border-b-0">{toc}</div>
          </details>

          <aside aria-label="On this page" className="hidden lg:block w-[260px] shrink-0 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <div className={`${mono} text-[11px] text-muted pb-2.5 border-b border-line`}>On this page</div>
            {toc}
          </aside>

          <article className="min-w-0 flex-1 max-w-[760px]">
            <section aria-label="Key points" className="rounded-[10px] border border-line bg-surface p-5 sm:p-6">
              <p className={`${mono} text-[11px] text-muted`}>The short answer</p>
              <ul className="mt-3 space-y-2.5">
                {post.takeaways.map((t) => (
                  <li key={t} className="flex gap-3 text-[16px] leading-[1.55] text-ink">
                    <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-mark" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>

            <PostMdx source={post.body} />

            {post.faq.length > 0 && (
              <section id="faq" aria-labelledby="faq-heading" className="pt-12 scroll-mt-24">
                <h2 id="faq-heading" className="font-heading text-[26px] font-semibold tracking-[-0.8px] text-ink mb-6">Common questions</h2>
                <FaqAccordion items={post.faq} />
              </section>
            )}

            {usesAffiliate(post.body) && (
              <p className="mt-10 text-sm text-muted">
                Some links on this page are affiliate links. If you buy through one, Watchems may earn a commission at no extra cost to you.
              </p>
            )}

            {related.length > 0 && (
              <section aria-labelledby="more-heading" className="pt-12">
                <h2 id="more-heading" className="font-heading text-[22px] font-semibold tracking-[-0.5px] text-ink mb-5">Keep reading</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {related.map((p) => (
                    <Link key={p.slug} href={postPath(p.slug)} className="block rounded-[10px] border border-line bg-surface p-5 hover:border-line-strong transition-colors">
                      <h3 className="font-heading text-lg font-semibold tracking-[-0.4px] text-ink">{p.h1}</h3>
                      <p className="mt-1 text-sm text-muted">{p.description}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </article>
        </div>
      </div>
    </>
  )
}
