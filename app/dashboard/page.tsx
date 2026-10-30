import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, and, ne, desc } from 'drizzle-orm'
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

export default async function DashboardPage(props: {
  searchParams: Promise<{ status?: string }>
}) {
  const searchParams = await props.searchParams
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const sortedPhotos = await db
    .select()
    .from(photos)
    .where(and(eq(photos.userId, userId), ne(photos.status, 'deleted')))
    .orderBy(desc(photos.createdAt))

  return <MyWatchesView photos={sortedPhotos} status={searchParams.status} />
}
