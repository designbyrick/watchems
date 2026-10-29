export type WatchStatus = 'approved' | 'pending' | 'rejected'

export interface GroupablePhoto {
  watchId: string
  status: string
  createdAt: Date
}

export interface WatchGroup<P extends GroupablePhoto> {
  watchId: string
  photos: P[]
  dominantStatus: WatchStatus
}

// One card per watch: live if any photo is approved, else in review if any is pending, else not approved.
// Photos with any other status (e.g. 'deleted') are ignored.
export function groupByWatch<P extends GroupablePhoto>(photos: P[]): WatchGroup<P>[] {
  const map = new Map<string, P[]>()
  for (const p of photos) {
    if (p.status !== 'approved' && p.status !== 'pending' && p.status !== 'rejected') continue
    if (!map.has(p.watchId)) map.set(p.watchId, [])
    map.get(p.watchId)!.push(p)
  }
  return Array.from(map.entries()).map(([watchId, groupPhotos]) => {
    const sorted = [...groupPhotos].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    const statuses = sorted.map((p) => p.status)
    const dominantStatus: WatchStatus = statuses.includes('approved')
      ? 'approved'
      : statuses.includes('pending')
      ? 'pending'
      : 'rejected'
    return { watchId, photos: sorted, dominantStatus }
  })
}
