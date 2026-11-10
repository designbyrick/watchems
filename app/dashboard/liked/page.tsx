import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import LikedClient from './LikedClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Liked Watches',
  description: 'Your liked watch photos.',
  robots: { index: false, follow: false },
}

export default async function LikedPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return <LikedClient />
}
