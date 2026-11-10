import Image from 'next/image'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import type { ReactNode } from 'react'
import { headingId } from '@/lib/posts'

const textOf = (children: ReactNode): string =>
  typeof children === 'string' ? children : Array.isArray(children) ? children.map(textOf).join('') : ''

const mono = 'font-mono uppercase tracking-[1px]'

// Spec or comparison table. MDX has no table syntax here (no remark-gfm), so posts pass rows.
function SpecTable({ columns, rows, caption }: { columns: string[]; rows: string[][]; caption?: string }) {
  return (
    <figure className="my-7 overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-[15px]">
        <thead>
          <tr className="border-b border-line-strong">
            {columns.map((c) => (
              <th key={c} scope="col" className={`py-2.5 pr-4 ${mono} text-[11px] font-medium text-muted`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line">
              {r.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="py-2.5 pr-4 font-semibold text-ink">{cell}</th>
                ) : (
                  <td key={j} className="py-2.5 pr-4 text-ink/90 tabular-nums">{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {caption && <figcaption className="mt-2 text-sm text-muted">{caption}</figcaption>}
    </figure>
  )
}

// A short aside: a common mistake with the fix, or a quick rule
function Note({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="my-6 rounded-[10px] border border-line bg-surface p-4 sm:p-5">
      {title && <p className="font-semibold text-ink">{title}</p>}
      <div className="mt-1 text-[15px] leading-[1.6] text-ink/90 [&_p]:m-0 [&_p+p]:mt-2">{children}</div>
    </aside>
  )
}

// An image inside the post: a diagram (.svg) or an illustration (.webp) from public/posts/<slug>/
function Figure({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="my-8">
      <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
        <Image
          src={src}
          alt={alt}
          width={1536}
          height={864}
          sizes="(max-width: 768px) 100vw, 680px"
          unoptimized={src.endsWith('.svg')}
          className="h-auto w-full"
        />
      </div>
      {caption && <figcaption className="mt-2 text-sm text-muted">{caption}</figcaption>}
    </figure>
  )
}

// An affiliate link. Marked sponsored for search engines; the page shows a disclosure when used.
function Affiliate({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="sponsored nofollow noopener noreferrer" className="text-ink underline underline-offset-2">
      {children}
    </a>
  )
}

const components = {
  SpecTable,
  Note,
  Figure,
  Affiliate,
  a: ({ href, children }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    href?.startsWith('/') ? (
      <Link href={href} className="text-ink underline underline-offset-2 hover:text-mark">{children}</Link>
    ) : (
      <a href={href} target="_blank" rel="nofollow noopener noreferrer" className="text-ink underline underline-offset-2 hover:text-mark">
        {children}
      </a>
    ),
  h2: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 id={headingId(textOf(children))} className="mt-12 mb-1 font-heading text-[26px] font-semibold tracking-[-0.8px] text-ink scroll-mt-24">
      {children}
    </h2>
  ),
  h3: ({ children }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mt-8 font-heading text-xl font-semibold tracking-[-0.4px] text-ink">{children}</h3>
  ),
  p: ({ children }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mt-3.5 text-[17px] leading-[1.65] text-ink/90">{children}</p>
  ),
  ul: ({ children }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mt-3.5 list-disc pl-5 space-y-2 text-[17px] leading-[1.6] text-ink/90">{children}</ul>
  ),
  ol: ({ children }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mt-3.5 list-decimal pl-5 space-y-2 text-[17px] leading-[1.6] text-ink/90">{children}</ol>
  ),
  strong: ({ children }: React.HTMLAttributes<HTMLElement>) => <strong className="font-semibold text-ink">{children}</strong>,
}

export const usesAffiliate = (body: string) => /<Affiliate\b/.test(body)

export default function PostMdx({ source }: { source: string }) {
  // Posts are committed files, not user input, so prop expressions like rows={[...]} are allowed.
  // Dangerous JS (eval, Function, process) stays blocked.
  return <MDXRemote source={source} components={components} options={{ blockJS: false, blockDangerousJS: true }} />
}
