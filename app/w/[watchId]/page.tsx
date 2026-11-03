export const dynamic = 'force-dynamic'
export const revalidate = 0

import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { isValidSlug } from '@/lib/validation'

interface WatchPageProps {
  params: Promise<{ watchId: string }>
}

// The watch hub was retired: its photos now live in the "same watch" section of
// each photo page. Old /w/ URLs (bookmarks, backlinks, indexed pages) go to the
// watch's primary photo.
export default async function WatchHubRedirect(props: WatchPageProps) {
  const params = await props.params
  if (!isValidSlug(params.watchId)) notFound()

  const rows = await db
    .select({ id: photos.id, slug: photos.slug })
    .from(photos)
    .where(and(eq(photos.watchId, params.watchId), eq(photos.status, 'approved')))
    .orderBy(asc(photos.sortOrder), asc(photos.createdAt))
    .limit(1)

  // No approved photos (yet) — temporary, the watch may get photos later
  if (rows.length === 0) redirect(`/?watch=${encodeURIComponent(params.watchId)}`)

  permanentRedirect(`/photo/${rows[0].slug ?? rows[0].id}`)
}
