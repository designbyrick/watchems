import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import MyWatchesView from './MyWatchesView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My Watches | Watchems',
  description: 'Manage your watch photo uploads.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: 'https://watchems.com/dashboard',
  },
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const sortedPhotos = await db
    .select()
    .from(photos)
    .where(eq(photos.userId, userId))
    .orderBy(desc(photos.createdAt))

  return <MyWatchesView photos={sortedPhotos} status={searchParams.status} />
}
