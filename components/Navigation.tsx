'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import Logo from '@/components/ui/Logo'

/* Clerk is only rendered when the publishable key is configured in Vercel env vars */
const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

const NAV_LINKS = [
  { href: '/', label: 'Gallery' },
  { href: '/brands', label: 'Brands' },
  { href: '/styles', label: 'Styles' },
  { href: '/buying-guides', label: 'Buying guides' },
  { href: '/dashboard/wrist-check', label: 'Wrist check' },
]

// Gallery, Brands, Upload, Boards and the account live in MobileTabBar below lg
const MENU_LINKS = [
  { href: '/styles', label: 'Styles' },
  { href: '/buying-guides', label: 'Buying guides' },
  { href: '/dashboard/wrist-check', label: 'Wrist check' },
  { href: '/about', label: 'About' },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/' || pathname.startsWith('/photo/')
  if (href === '/brands') return pathname.startsWith('/brand')
  if (href === '/styles') return pathname.startsWith('/style')
  if (href === '/buying-guides') return pathname.startsWith('/buying-guide')
  return pathname.startsWith(href)
}

const dashboardIcon = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7.5" height="9" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="9" rx="1.5" />
    <rect x="3" y="15" width="7.5" height="6" rx="1.5" />
    <rect x="13.5" y="15" width="7.5" height="6" rx="1.5" />
  </svg>
)

const ClerkAuth = clerkEnabled
  ? dynamic(() =>
      import('@clerk/nextjs').then((mod) => {
        const { SignedIn, SignedOut, SignInButton, UserButton } = mod
        return {
          default: () => (
            <>
              <SignedOut>
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="h-10 px-4 rounded-full border border-line text-sm font-medium text-ink hover:border-line-strong transition-colors whitespace-nowrap"
                  >
                    Sign in
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: 'w-10 h-10',
                      userButtonTrigger: 'rounded-full ring-1 ring-line focus:shadow-none',
                    },
                  }}
                >
                  <UserButton.MenuItems>
                    <UserButton.Link label="My watches" labelIcon={dashboardIcon} href="/dashboard" />
                  </UserButton.MenuItems>
                </UserButton>
              </SignedIn>
            </>
          ),
        }
      }),
      { ssr: false, loading: () => <span className="block w-10 h-10" aria-hidden="true" /> }
    )
  : () => null

export default function Navigation() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close mobile menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', handler)
    return () => window.removeEventListener('pointerdown', handler)
  }, [menuOpen])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  // Upload is a focused flow: logo + Cancel only
  if (pathname.startsWith('/upload')) {
    return (
      <header className="sticky top-0 z-50 bg-canvas/95 backdrop-blur border-b border-line">
        <nav aria-label="Main" className="max-w-[1320px] mx-auto px-4 sm:px-8 h-14 lg:h-[72px] flex items-center gap-8">
          <Link href="/" aria-label="Watchems home" className="shrink-0 text-ink">
            <Logo />
          </Link>
          <div className="flex-1" />
          <Link href="/" className="h-11 flex items-center text-[15px] font-medium text-muted hover:text-ink transition-colors">
            Cancel
          </Link>
        </nav>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 bg-canvas/95 backdrop-blur border-b border-line">
      <nav aria-label="Main" className="max-w-[1320px] mx-auto px-4 sm:px-8 h-14 lg:h-[72px] flex items-center gap-8">

        <Link href="/" aria-label="Watchems home" className="shrink-0 text-ink">
          <Logo />
        </Link>

        {/* Desktop links */}
        <ul className="hidden lg:flex items-center gap-6 text-[15px] font-medium">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href)
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`transition-colors ${active ? 'text-ink' : 'text-muted hover:text-ink'}`}
                >
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="flex-1" />

        {/* Desktop actions */}
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          <Link
            href="/upload"
            className="h-11 px-[18px] rounded-full bg-ink text-white hover:bg-ink-hover transition-colors flex items-center gap-2 text-[15px] font-semibold whitespace-nowrap"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add a wrist shot
          </Link>
          <ClerkAuth />
        </div>

        {/* Mobile: secondary links menu */}
        <div ref={menuRef} className="relative lg:hidden flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 rounded-full border border-line flex items-center justify-center text-ink"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            ) : (
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-xl border border-line shadow-md py-2 z-50">
              {MENU_LINKS.map((link) => {
                const active = isActive(pathname, link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex items-center h-11 px-4 text-[15px] font-medium hover:bg-canvas transition-colors ${active ? 'text-ink' : 'text-muted'}`}
                  >
                    {active && <span className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-full bg-mark" aria-hidden="true" />}
                    {link.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}
