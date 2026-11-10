import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getAllPosts, postPath } from '@/lib/posts'
import { serializeJsonLd } from '@/lib/jsonLd'

export const dynamic = 'force-dynamic'

const description = 'Plain answers to the questions watch buyers search for, illustrated with real wrist shots from Watchems owners.'

export function generateMetadata(): Metadata {
  return {
    title: 'Learn About Watches',
    description,
    alternates: { canonical: 'https://watchems.com/learn' },
    openGraph: { title: 'Learn About Watches', description, url: 'https://watchems.com/learn', type: 'website', siteName: 'Watchems' },
    // Kept out of search until the first post is live
    ...(getAllPosts().length === 0 && { robots: { index: false, follow: true } }),
  }
}

export default function LearnIndexPage() {
  const posts = getAllPosts()

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://watchems.com' },
      { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://watchems.com/learn' },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />

      <div className="max-w-[1320px] mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-16 sm:pb-[72px]">
        <section className="max-w-[760px]">
          <p className="font-mono text-xs uppercase tracking-[1px] text-muted">Learn</p>
          <h1 className="mt-3 font-heading text-[40px] sm:text-[56px] leading-[1.02] font-semibold tracking-display text-ink">
            Watch questions, answered.
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-[1.55] text-muted">{description}</p>
        </section>

        {posts.length === 0 ? (
          <p className="mt-10 text-muted">
            No articles yet. Meanwhile, see the <Link href="/buying-guides" className="text-ink underline">buying guides</Link>.
          </p>
        ) : (
          <div className="mt-8 sm:mt-11 grid gap-6 grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))]">
            {posts.map((p, i) => (
              <Link
                key={p.slug}
                href={postPath(p.slug)}
                className="group flex flex-col rounded-[10px] overflow-hidden bg-surface border border-line hover:border-line-strong transition-colors"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-subtle">
                  <Image
                    src={p.cover.src}
                    alt={p.cover.alt}
                    fill
                    priority={i === 0}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 420px"
                    className="object-cover transition-transform duration-[350ms] ease-out group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-col gap-2.5 px-[22px] pt-[22px] pb-6">
                  <span className="font-mono text-[11px] uppercase tracking-[1px] text-muted">{p.short}</span>
                  <h2 className="font-heading text-[24px] leading-[1.15] font-semibold tracking-[-0.8px] text-ink">{p.h1}</h2>
                  <p className="text-[15px] leading-normal text-muted">{p.description}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
