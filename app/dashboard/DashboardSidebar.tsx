'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'

interface DashboardSidebarProps {
  user: {
    displayName: string
    initial: string
    memberSince: number | null
  }
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'My Watches' },
  { href: '/dashboard/wrist-check', label: 'Wrist Check' },
  { href: '/dashboard/boards', label: 'Collections' },
  { href: '/dashboard/liked', label: 'Liked' },
  { href: '/dashboard/profile', label: 'Profile' },
] as const

function isActivePath(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
}

export default function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname()
  const { signOut } = useClerk()

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        aria-label="Dashboard"
        className="hidden lg:flex lg:flex-col lg:w-[264px] lg:shrink-0 gap-0.5 px-4 py-6 border-r border-line sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto"
      >
        <div className="flex items-center gap-3 px-3 pt-2 pb-5">
          <span className="w-11 h-11 rounded-full bg-ink text-white flex items-center justify-center font-semibold shrink-0">
            {user.initial}
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-ink truncate">{user.displayName}</p>
            {user.memberSince && (
              <p className="font-mono text-xs text-muted">Member since {user.memberSince}</p>
            )}
          </div>
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = isActivePath(pathname, item.href)
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

        <div className="mt-auto pt-6 flex flex-col gap-0.5 border-t border-line">
          <Link
            href="/dashboard/account"
            aria-current={pathname.startsWith('/dashboard/account') ? 'page' : undefined}
            className={`h-10 rounded-md flex items-center px-3 text-sm transition-colors ${
              pathname.startsWith('/dashboard/account')
                ? 'bg-surface font-semibold text-ink shadow-[inset_2px_0_0_theme(colors.mark)]'
                : 'text-muted hover:bg-subtle hover:text-ink'
            }`}
          >
            Account settings
          </Link>
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: '/' })}
            className="h-10 rounded-md flex items-center px-3 text-sm text-muted hover:bg-subtle hover:text-ink transition-colors text-left"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Mobile header + tabs */}
      <div className="lg:hidden border-b border-line">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <span className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center text-sm font-semibold shrink-0">
            {user.initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink truncate">{user.displayName}</p>
            {user.memberSince && (
              <p className="font-mono text-[11px] text-muted">Member since {user.memberSince}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: '/' })}
            className="h-11 px-1 text-sm font-medium text-muted hover:text-ink transition-colors shrink-0"
          >
            Sign out
          </button>
        </div>

        <nav aria-label="Dashboard" className="flex gap-6 overflow-x-auto scrollbar-hide px-4">
          {NAV_ITEMS.map((item) => {
            const isActive = isActivePath(pathname, item.href)
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
