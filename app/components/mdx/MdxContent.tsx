import { MDXRemote } from 'next-mdx-remote/rsc'
import Link from 'next/link'
import Image from 'next/image'
import WatchRecommendation from './WatchRecommendation'
import ComparisonTable from './ComparisonTable'
import Callout from './Callout'
import PullQuote from './PullQuote'
import ProsCons from './ProsCons'

// Custom MDX components map — these are available inside .mdx files
const components = {
  // Custom MDX components
  WatchRecommendation,
  ComparisonTable,
  Callout,
  PullQuote,
  ProsCons,
  // Override default HTML elements for consistent styling
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (href?.startsWith('/')) {
      return (
        <Link href={href} className="text-ink hover:underline" {...props}>
          {children}
        </Link>
      )
    }
    return (
      <a
        href={href}
        className="text-ink hover:underline"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    )
  },
  img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
    if (!src) return null
    return (
      <span className="block my-6">
        <Image
          src={src}
          alt={alt ?? ''}
          width={800}
          height={450}
          className="rounded-sm w-full h-auto"
          {...(props as Record<string, unknown>)}
        />
      </span>
    )
  },
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id =
      typeof children === 'string'
        ? children
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
        : undefined
    return (
      <h2 id={id} className="text-2xl font-bold text-ink mt-10 mb-4" {...props}>
        {children}
      </h2>
    )
  },
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id =
      typeof children === 'string'
        ? children
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
        : undefined
    return (
      <h3 id={id} className="text-xl font-semibold text-ink mt-8 mb-3" {...props}>
        {children}
      </h3>
    )
  },
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-muted leading-relaxed mb-4" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-inside text-muted space-y-2 mb-4 ml-4" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal list-inside text-muted space-y-2 mb-4 ml-4" {...props}>
      {children}
    </ol>
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-ink" {...props}>
      {children}
    </strong>
  ),
  hr: () => <hr className="border-line my-8" />,
}

interface MdxContentProps {
  source: string
}

export default function MdxContent({ source }: MdxContentProps) {
  return (
    <div className="mdx-content">
      <MDXRemote source={source} components={components} />
    </div>
  )
}
