import type { Metadata } from 'next'
import { auth, clerkClient } from '@clerk/nextjs/server'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}
import { redirect } from 'next/navigation'
import DashboardSidebar from './DashboardSidebar'
import { ensureTermsAccepted } from '@/lib/requireTerms'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  await ensureTermsAccepted(userId)

  // Fetch user details for sidebar
  const client = await clerkClient()
  const user = await client.users.getUser(userId)

  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user.username || 'User'

  const sidebarUser = {
    displayName,
    initial: displayName[0]?.toUpperCase() || 'W',
    memberSince: user.createdAt ? new Date(user.createdAt).getFullYear() : null,
  }

  return (
    <div className="max-w-[1320px] mx-auto flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-72px)]">
      <DashboardSidebar user={sidebarUser} />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
