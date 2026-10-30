'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin/photos', label: 'Photos' },
  { href: '/admin/reviews', label: 'Reviews' },
] as const

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        aria-label="Admin"
        className="hidden lg:flex lg:flex-col lg:w-[264px] lg:shrink-0 gap-0.5 px-4 py-6 border-r border-line sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto"
      >
        <Link
          href="/admin"
          aria-current={pathname === '/admin' ? 'page' : undefined}
          className="flex items-center gap-3 px-3 pt-2 pb-5 rounded-md"
        >
          <span className="w-11 h-11 rounded-full bg-ink text-white flex items-center justify-center shrink-0" aria-hidden="true">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7.5 3v5.25c0 4.6-3.2 8.4-7.5 9.75-4.3-1.35-7.5-5.15-7.5-9.75V6L12 3z" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold text-ink">Admin</span>
            <span className="block font-mono text-xs text-muted">Moderation</span>
          </span>
        </Link>

        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`h-11 rounded-md flex items-center px-3 text-[15px] transition-colors ${
                isActive
                  ? 'bg-surface font-semibold text-ink shadow-[inset_2px_0_0_theme(colors.mark)]'
                  : 'text-muted hover:bg-subtle hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          )
        })}

        <div className="mt-auto pt-6 border-t border-line">
          <Link
            href="/dashboard"
            className="h-10 rounded-md flex items-center px-3 text-sm text-muted hover:bg-subtle hover:text-ink transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </nav>

      {/* Mobile tabs */}
      <div className="lg:hidden border-b border-line">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-1">
          <Link href="/admin" className="h-11 flex items-center font-mono text-[11px] tracking-[1px] uppercase text-muted">
            Admin
          </Link>
        </div>
        <nav aria-label="Admin" className="flex gap-6 overflow-x-auto scrollbar-hide px-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`h-11 flex items-center text-[15px] whitespace-nowrap transition-colors ${
                  isActive
                    ? 'font-semibold text-ink shadow-[inset_0_-2px_0_theme(colors.mark)]'
                    : 'font-medium text-muted hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
