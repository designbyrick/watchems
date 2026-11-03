import { sql } from 'drizzle-orm'
import { photos } from '@/lib/db/schema'

// A watch has no page of its own: it links to its primary photo, whose page lists
// the other owners' photos of the same watch. Use inside a query grouped by watchId.
// Lowest (sortOrder, createdAt) is always the first photo of its uploader's carousel,
// so the link never lands on a secondary photo that canonicalizes elsewhere.
export const primaryPhotoSlug = sql<string>`(array_agg(coalesce(${photos.slug}, ${photos.id}::text) order by ${photos.sortOrder}, ${photos.createdAt}))[1]`
