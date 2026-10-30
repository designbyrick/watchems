import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import WristCheckClient from './WristCheckClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Wrist Check',
  description: 'Track which watch you wear each day.',
  robots: { index: false, follow: false },
}

export default async function WristCheckPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return <WristCheckClient />
}
