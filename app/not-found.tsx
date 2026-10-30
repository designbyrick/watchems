import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <p className="font-mono text-xs tracking-[1px] uppercase text-muted">Error 404</p>
      <h1 className="mt-3 text-[36px] sm:text-[44px] leading-[1.05] font-semibold tracking-[-1.8px] text-ink">Page not found</h1>
      <p className="mt-4 text-[15px] text-muted leading-relaxed">
        The watch or page you&apos;re looking for doesn&apos;t exist in our library.
      </p>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <Link
          href="/"
          className="h-11 px-5 rounded-full bg-ink text-white hover:bg-ink-hover transition-colors flex items-center text-[15px] font-semibold"
        >
          Browse the gallery
        </Link>
        <Link
          href="/brands"
          className="h-11 px-5 rounded-full border border-line text-ink hover:border-line-strong transition-colors flex items-center text-[15px] font-semibold"
        >
          Browse brands
        </Link>
      </div>
    </div>
  )
}
