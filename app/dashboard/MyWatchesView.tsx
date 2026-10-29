import Link from 'next/link'
import type { photos } from '@/lib/db/schema'
import PhotoGrid from './PhotoGrid'
import DashboardEmpty from './DashboardEmpty'
import { groupByWatch, type WatchStatus } from './watchGroups'

const TABS: { id: string; label: string; status: WatchStatus | null }[] = [
  { id: 'all', label: 'All', status: null },
  { id: 'live', label: 'Live', status: 'approved' },
  { id: 'review', label: 'In review', status: 'pending' },
  { id: 'rejected', label: 'Not approved', status: 'rejected' },
]

export default function MyWatchesView({
  photos: userPhotos,
  status,
}: {
  photos: (typeof photos.$inferSelect)[]
  status?: string
}) {
  const groups = groupByWatch(userPhotos)
  const count = (s: WatchStatus) => groups.filter((g) => g.dominantStatus === s).length
  const stats = [
    { label: 'Live', value: count('approved') },
    { label: 'In review', value: count('pending') },
    { label: 'Not approved', value: count('rejected') },
  ]

  const activeTab = TABS.find((t) => t.id === status) ?? TABS[0]
  const visibleGroups = activeTab.status
    ? groups.filter((g) => g.dominantStatus === activeTab.status)
    : groups

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-8 pb-16">
      <h1 className="text-[32px] sm:text-[40px] leading-tight font-semibold tracking-[-0.04em] text-ink">My Watches</h1>
      <p className="mt-2 text-[15px] text-muted">Your submissions and their review status.</p>

      <dl className="mt-6 lg:mt-7 grid grid-cols-3 gap-2 sm:gap-3 max-w-[720px]">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface border border-line rounded-[10px] px-3 py-3 sm:px-[18px] sm:py-4 min-w-0">
            <dt className="font-mono text-[10px] sm:text-[11px] tracking-[1px] uppercase text-muted truncate">{s.label}</dt>
            <dd className="mt-1.5 text-2xl sm:text-[30px] leading-none font-semibold tracking-[-1px] text-ink">{s.value}</dd>
          </div>
        ))}
      </dl>

      {groups.length === 0 ? (
        <DashboardEmpty
          title="No wrist shots yet"
          message="Add a photo of your watch on the wrist. Once it is reviewed, it goes live in the gallery."
          actionUrl="/upload"
          actionText="Add a wrist shot"
        />
      ) : (
        <>
          <nav aria-label="Filter by status" className="mt-8 flex gap-[22px] border-b border-line overflow-x-auto scrollbar-hide">
            {TABS.map((t) => {
              const active = t.id === activeTab.id
              return (
                <Link
                  key={t.id}
                  href={t.status ? `/dashboard?status=${t.id}` : '/dashboard'}
                  scroll={false}
                  aria-current={active ? 'page' : undefined}
                  className={`h-11 flex items-center whitespace-nowrap text-[15px] transition-colors ${
                    active
                      ? 'font-semibold text-ink shadow-[inset_0_-2px_0_theme(colors.mark)]'
                      : 'font-medium text-muted hover:text-ink'
                  }`}
                >
                  {t.label}
                </Link>
              )
            })}
          </nav>

          {visibleGroups.length === 0 ? (
            <p className="mt-10 text-[15px] text-muted">Nothing here right now.</p>
          ) : (
            <PhotoGrid groups={visibleGroups} />
          )}
        </>
      )}
    </div>
  )
}
