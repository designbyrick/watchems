'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'

/* Clerk is only rendered when the publishable key is configured in Vercel env vars */
const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

/** The bar is hidden on focused flows that have their own bottom actions. */
export function showsTabBar(pathname: string) {
  return !(pathname.startsWith('/upload') || pathname.startsWith('/admin'))
}

const ITEM = 'w-12 h-12 flex items-center justify-center rounded-full transition-colors'

const profileIcon = (
  <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
)

function avatarRing(active: boolean) {
  return `w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-semibold ${
    active ? 'ring-2 ring-ink' : 'border border-line'
  }`
}

const ClerkProfile = clerkEnabled
  ? dynamic(() =>
      import('@clerk/nextjs').then((mod) => {
        const { ClerkLoading, SignedIn, SignedOut, SignInButton, useUser } = mod
        function Avatar({ active }: { active: boolean }) {
          const { user } = useUser()
          const initial = (user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress || '?').charAt(0).toUpperCase()
          return (
            <Link href="/dashboard" aria-label="Your profile" aria-current={active ? 'page' : undefined} className={`${ITEM} text-ink`}>
              <span className={avatarRing(active)}>
                {user?.hasImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </span>
            </Link>
          )
        }
        return {
          default: ({ active }: { active: boolean }) => (
            <>
              <ClerkLoading>
                <span className={`${ITEM} text-faint`} aria-hidden="true">{profileIcon}</span>
              </ClerkLoading>
              <SignedOut>
                <SignInButton mode="modal">
                  <button type="button" aria-label="Sign in" className={`${ITEM} text-muted`}>
                    {profileIcon}
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Avatar active={active} />
              </SignedIn>
            </>
          ),
        }
      }),
      { ssr: false, loading: () => <span className={`${ITEM} text-faint`} aria-hidden="true">{profileIcon}</span> }
    )
  : ({ active }: { active: boolean }) => (
      <Link href="/dashboard" aria-label="Your profile" aria-current={active ? 'page' : undefined} className={`${ITEM} ${active ? 'text-ink' : 'text-muted'}`}>
        {profileIcon}
      </Link>
    )

export default function MobileTabBar() {
  const pathname = usePathname()
  if (!showsTabBar(pathname)) return null

  const galleryActive = pathname === '/' || pathname.startsWith('/photo/')
  const brandsActive = pathname.startsWith('/brand')
  const boardsActive = pathname.startsWith('/dashboard/boards')
  const profileActive = pathname.startsWith('/dashboard') && !boardsActive

  const tone = (active: boolean) => (active ? 'text-ink' : 'text-muted hover:text-ink')

  return (
    <nav
      aria-label="Quick"
      className="lg:hidden fixed inset-x-3 z-40 bottom-[max(16px,env(safe-area-inset-bottom))] h-16 rounded-full bg-surface border border-line shadow-md flex items-center justify-around"
    >
      <Link href="/" aria-label="Gallery" aria-current={galleryActive ? 'page' : undefined} className={`${ITEM} ${tone(galleryActive)}`}>
        <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7.5" height="9" rx="1.5" />
          <rect x="13.5" y="3" width="7.5" height="9" rx="1.5" />
          <rect x="3" y="15" width="7.5" height="6" rx="1.5" />
          <rect x="13.5" y="15" width="7.5" height="6" rx="1.5" />
        </svg>
      </Link>
      <Link href="/brands" aria-label="Brands" aria-current={brandsActive ? 'page' : undefined} className={`${ITEM} ${tone(brandsActive)}`}>
        <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </Link>
      <Link
        href="/upload"
        aria-label="Add a wrist shot"
        className="w-[52px] h-[52px] rounded-full bg-ink text-white hover:bg-ink-hover transition-colors flex items-center justify-center"
      >
        <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>
      <Link href="/dashboard/boards" aria-label="Boards" aria-current={boardsActive ? 'page' : undefined} className={`${ITEM} ${tone(boardsActive)}`}>
        <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" aria-hidden="true">
          <path d="M6 3h12v18l-6-4.5L6 21z" />
        </svg>
      </Link>
      <ClerkProfile active={profileActive} />
    </nav>
  )
}
