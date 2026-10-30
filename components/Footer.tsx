'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import { showsTabBar } from '@/components/MobileTabBar'

const COLUMNS = [
  {
    label: 'Browse',
    links: [
      { href: '/', label: 'Gallery' },
      { href: '/brands', label: 'Brands' },
      { href: '/styles', label: 'Styles' },
      { href: '/watches', label: 'Watch models' },
    ],
  },
  {
    label: 'Contribute',
    links: [
      { href: '/upload', label: 'Add a wrist shot' },
      { href: '/buying-guides', label: 'Buying guides' },
    ],
  },
  {
    label: 'Watchems',
    links: [
      { href: '/about', label: 'About' },
      { href: '/about#contact', label: 'Contact' },
    ],
  },
]

const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/copyright', label: 'Copyright' },
]

export default function Footer() {
  const pathname = usePathname()
  // Clear the floating MobileTabBar (64px + 16px offset) plus the iOS home indicator
  const tabBarPad = showsTabBar(pathname) ? 'pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-0' : ''

  return (
    <footer className={`bg-canvas border-t border-line mt-16 ${tabBarPad}`}>
      <div className="max-w-[1320px] mx-auto px-4 sm:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-x-6 gap-y-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" aria-label="Watchems home" className="inline-flex text-ink">
              <Logo />
            </Link>
            <p className="mt-4 text-muted text-sm leading-relaxed max-w-xs">
              A visual reference library of real wrist shots, from Seiko to Rolex.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.label}>
              <h2 className="font-mono text-[11px] tracking-[1px] uppercase text-faint mb-3">{col.label}</h2>
              <ul>
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="flex items-center min-h-[36px] text-sm text-muted hover:text-ink transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-line mt-10 pt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <p className="font-mono text-[11px] tracking-[1px] uppercase text-faint">
            © {new Date().getFullYear()} Watchems
          </p>
          <div className="flex flex-wrap -mx-2">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-2 min-h-[44px] flex items-center font-mono text-[11px] tracking-[1px] uppercase text-faint hover:text-ink transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
