import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import Image from 'next/image'
import Link from 'next/link'
import PhotoGallery from '@/components/home/PhotoGallery'

export async function generateMetadata(
  { params }: { params: { userId: string } }
): Promise<Metadata> {
  try {
    const user = await (await clerkClient()).users.getUser(params.userId)
    const displayName = user.firstName
      ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
      : user.username || 'User'

    return {
      title: `${displayName}'s Watch Collection`,
      description: `View ${displayName}'s watch collection on Watchems — real wrist shots from real owners.`,
      robots: {
        index: true,
        follow: true,
      },
      alternates: {
        canonical: `https://watchems.com/profile/${params.userId}`,
      },
    }
  } catch {
    return {
      title: 'User Profile',
      description: 'View a watch collection on Watchems.',
    }
  }
}

export default async function ProfilePage({ params }: { params: { userId: string } }) {
  // Fetch user from Clerk
  let user
  try {
    user = await (await clerkClient()).users.getUser(params.userId)
  } catch {
    notFound()
  }

  // Fetch approved photos for this user
  // Get photo count for display
  const [{ photoCount }] = await db
    .select({ photoCount: sql<number>`count(*)::int` })
    .from(photos)
    .where(and(eq(photos.userId, params.userId), eq(photos.status, 'approved')))

  // Get display name and avatar
  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user.username || 'User'

  const avatar = user.imageUrl

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="max-w-[80rem] mx-auto px-4 py-12">
        {/* Back link */}
        <Link href="/" className="text-sm text-faint hover:text-ink mb-8 inline-block">
          &larr; Back to home
        </Link>

        {/* User header */}
        <div className="bg-surface border border-line-strong rounded-2xl p-8 mb-12 shadow-sm">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {avatar ? (
                <Image
                  src={avatar}
                  alt={displayName}
                  width={120}
                  height={120}
                  className="w-28 h-28 rounded-full object-cover border-2 border-line-strong"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-ink to-ink-hover flex items-center justify-center text-white text-4xl font-bold border-2 border-line-strong">
                  {initials || '?'}
                </div>
              )}
            </div>

            {/* User info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{displayName}</h1>
              <p className="text-faint mb-4">Watch Collector</p>
              <div className="text-sm text-muted">
                <p>
                  <span className="font-semibold text-ink">{photoCount}</span> photo{photoCount !== 1 ? 's' : ''} uploaded
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Collection gallery */}
        <h2 className="text-2xl font-bold mb-6">Collection</h2>
        <PhotoGallery userId={params.userId} />
      </div>
    </div>
  )
}
