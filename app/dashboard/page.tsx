import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, and, ne, desc } from 'drizzle-orm'
import Link from 'next/link'
import PhotoGrid from './PhotoGrid'
import EmptyState from '@/components/ui/EmptyState'

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

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const sortedPhotos = await db
    .select()
    .from(photos)
    .where(and(eq(photos.userId, userId), ne(photos.status, 'deleted')))
    .orderBy(desc(photos.createdAt))

  return (
    <div className="py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Watches</h1>
            <p className="text-gray-600 text-sm mt-1">
              Your submitted watch photos and their moderation status.
            </p>
          </div>
          <Link
            href="/upload"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors shrink-0 text-center w-full sm:w-auto"
          >
            Upload a Watch
          </Link>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6">
            {sortedPhotos.length === 0 ? (
              <EmptyState
                icon="📸"
                title="No uploads yet"
                message="You haven't uploaded any watch photos yet. Start contributing to the Watchems community!"
                actionUrl="/upload"
                actionText="Upload Your First Watch"
                actionStyle="blue"
              />
            ) : (
              <PhotoGrid photos={sortedPhotos} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
