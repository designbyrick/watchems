'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import BrandPhotoCard, { type BrandPhoto } from './BrandPhotoCard'

interface BrandModelGridProps {
  brand: string
  brandLabel: string
  /** The brand's most-photographed model names, in chip order */
  models: (string | null)[]
  photosById: Record<string, BrandPhoto>
  /** Photo ids per grid: '' for all models, otherwise keyed by model name */
  grids: Record<string, string[]>
}

// Model chips + photo grid. The page is cached (ISR), so the ?model= filter is
// read on the client and picks one of the grids the server prepared.
export function BrandModelGridView({ brand, brandLabel, models, photosById, grids, activeModel }: BrandModelGridProps & { activeModel: string | null }) {
  const gridPhotos = (grids[activeModel ?? ''] ?? []).map((id) => photosById[id])
  return (
    <>
      {/* Model chips */}
      {models.length > 1 && (
        <div role="group" aria-label="Models" className="mt-5 flex gap-2 overflow-x-auto sm:flex-wrap -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
          {[{ modelName: null as string | null, label: 'All models' }, ...models.map((m) => ({ modelName: m, label: m ?? '' }))].map((chip) => {
            const active = chip.modelName === activeModel
            const href = chip.modelName
              ? `/brand/${brand}?model=${encodeURIComponent(chip.modelName)}`
              : `/brand/${brand}`
            return (
              <Link
                key={chip.label}
                href={href}
                scroll={false}
                aria-current={active ? 'true' : undefined}
                className={`shrink-0 h-10 rounded-full border px-4 flex items-center text-sm whitespace-nowrap transition-colors ${
                  active
                    ? 'border-ink bg-ink text-white font-semibold'
                    : 'border-line bg-surface text-ink font-medium hover:border-line-strong'
                }`}
              >
                {chip.label}
              </Link>
            )
          })}
        </div>
      )}

      {/* Photo grid */}
      <div className="mt-7 grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-9">
        {gridPhotos.map((photo, i) => (
          <BrandPhotoCard key={photo.id} photo={photo} brandLabel={brandLabel} eager={i < 6} />
        ))}
        <Link
          href="/upload"
          className="flex flex-col items-center justify-center gap-2.5 aspect-[4/5] border-[1.5px] border-dashed border-line-strong rounded-md text-muted text-center p-6 hover:border-ink hover:text-ink transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          <span className="text-[15px] font-semibold text-ink">Own a {brandLabel}?</span>
          <span className="text-[13px]">Add your wrist shot</span>
        </Link>
      </div>
    </>
  )
}

export default function BrandModelGrid(props: BrandModelGridProps) {
  const requested = useSearchParams().get('model')
  // Same case-insensitive match against the chips the server used to do
  const activeModel = requested
    ? props.models.find((m) => m?.toLowerCase() === requested.toLowerCase()) ?? null
    : null
  return <BrandModelGridView {...props} activeModel={activeModel} />
}
