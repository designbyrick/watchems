'use client'

import { UserProfile } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

export default function AccountPage() {
  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-8 pb-16">
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-[32px] sm:text-[40px] leading-tight font-semibold tracking-[-0.04em] text-ink">Account settings</h1>
          <p className="mt-2 text-[15px] text-muted">
            Manage your email, password and connected accounts.
          </p>
        </div>

        <UserProfile
          appearance={{
            elements: {
              rootBox: 'w-full',
              cardBox: 'w-full shadow-none',
              card: 'w-full shadow-none border border-line rounded-[10px]',
              pageScrollBox: 'p-0',
            },
          }}
        />
      </div>
    </div>
  )
}
