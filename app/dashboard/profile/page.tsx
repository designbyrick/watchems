import type { Metadata } from 'next'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'Manage your profile and avatar.',
  robots: { index: false, follow: false },
}

export default async function DashboardProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const client = await clerkClient()
  const user = await client.users.getUser(userId)

  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user.username || 'User'

  return (
    <ProfileClient
      userId={userId}
      displayName={displayName}
      firstName={user.firstName || ''}
      lastName={user.lastName || ''}
      username={user.username || ''}
      avatarUrl={user.imageUrl || null}
      email={user.emailAddresses?.[0]?.emailAddress || ''}
    />
  )
}
