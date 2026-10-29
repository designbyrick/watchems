import Link from 'next/link'

interface BrandPhoto {
  id: string
  slug: string | null
  url: string
  thumbnailUrl: string | null
  brandName: string | null
  modelName: string | null
  referenceNumber: string | null
  watchId: string
}

function unslugify(slug: string) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// 4:5 card matching the home gallery tile (mono brand + semibold model)
export default function BrandPhotoCard({ photo, brandLabel, eager }: { photo: BrandPhoto; brandLabel: string; eager?: boolean }) {
  const title = photo.modelName || photo.referenceNumber || unslugify(photo.watchId)
  return (
    <Link
      href={`/photo/${photo.slug ?? photo.id}`}
      className="group block min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-canvas"
    >
      <div className="aspect-[4/5] overflow-hidden rounded-md bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.thumbnailUrl || photo.url}
          alt={`${[photo.brandName || brandLabel, photo.modelName].filter(Boolean).join(' ')} wrist shot`}
          className="block w-full h-full object-cover transition-transform duration-[350ms] ease-out group-hover:scale-[1.035]"
          loading={eager ? 'eager' : 'lazy'}
        />
      </div>
      <p className="mt-2 sm:mt-3 font-mono text-[10.5px] sm:text-[11px] tracking-[0.8px] sm:tracking-[1px] uppercase text-muted truncate">
        {photo.brandName || brandLabel}
      </p>
      <p className="mt-[3px] sm:mt-1 text-[15px] sm:text-[17px] leading-[1.25] font-semibold tracking-[-0.2px] text-ink">
        {title}
      </p>
    </Link>
  )
}
