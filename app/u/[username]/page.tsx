import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import Image from 'next/image'
import Link from 'next/link'
import PhotoGallery from '@/components/home/PhotoGallery'

export const dynamic = 'force-dynamic'

async function getUserByUsername(username: string) {
  const client = await clerkClient()
  const result = await client.users.getUserList({ username: [username], limit: 1 })
  return result.data[0] ?? null
}

export async function generateMetadata(
  { params }: { params: { username: string } }
): Promise<Metadata> {
  try {
    const user = await getUserByUsername(params.username)
    if (!user) {
      return { title: 'Profile Not Found | Watchems' }
    }

    const displayName = user.firstName
      ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
      : user.username || 'User'

    return {
      title: `${displayName}'s Watch Collection | Watchems`,
      description: `View ${displayName}'s watch collection on Watchems — real wrist shots from real owners.`,
      robots: { index: true, follow: true },
      alternates: {
        canonical: `https://watchems.com/u/${params.username}`,
      },
    }
  } catch {
    return { title: 'Profile Not Found | Watchems' }
  }
}

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const user = await getUserByUsername(params.username)

  if (!user) {
    notFound()
  }

  const [{ photoCount }] = await db
    .select({ photoCount: sql<number>`count(*)::int` })
    .from(photos)
    .where(and(eq(photos.userId, user.id), eq(photos.status, 'approved')))

  // Distinct brands this user has submitted — for server-rendered links into brand hierarchy
  const userBrands = await db
    .selectDistinct({ brandName: photos.brandName })
    .from(photos)
    .where(and(eq(photos.userId, user.id), eq(photos.status, 'approved')))
    .orderBy(asc(photos.brandName))
    .then((rows) => rows.map((r) => r.brandName).filter(Boolean) as string[])

  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user.username || 'User'

  const avatar = user.imageUrl
  const memberSince = new Date(user.createdAt)

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className="max-w-[80rem] mx-auto px-4 py-12">
        {/* Back link */}
        <Link href="/" className="text-sm text-faint hover:text-ink mb-8 inline-block">
          &larr; Back to home
        </Link>

        {/* User header */}
        <div className="bg-surface border border-line-strong rounded-2xl p-8 mb-12 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
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
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">{displayName}</h1>
              <p className="text-faint mb-4">Watch Collector</p>
              <div className="flex flex-wrap gap-6 justify-center sm:justify-start text-sm text-muted">
                <div>
                  <span className="font-semibold text-ink">{photoCount}</span>{' '}
                  photo{photoCount !== 1 ? 's' : ''} uploaded
                </div>
                <div>
                  <span className="font-semibold text-ink">{photoCount}</span>{' '}
                  approved photo{photoCount !== 1 ? 's' : ''}
                </div>
                <div>
                  Member since{' '}
                  <span className="font-semibold text-ink">
                    {memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
              {userBrands.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                  {userBrands.map((brand) => (
                    <Link
                      key={brand}
                      href={`/brand/${encodeURIComponent(brand.toLowerCase())}`}
                      className="text-xs px-2.5 py-1 rounded-full border border-line-strong text-faint hover:text-ink hover:border-ink transition-colors"
                    >
                      {brand}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collection gallery */}
        <h2 className="text-2xl font-bold mb-6">Collection</h2>
        <PhotoGallery userId={user.id} />
      </div>
    </main>
  )
}
