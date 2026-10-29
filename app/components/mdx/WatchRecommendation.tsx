interface WatchRecommendationProps {
  brand: string
  name: string
  highlight: string
  specs?: string
  slug?: string
  reference?: string
  price?: string
  priceRange?: string
  movementType?: string
  caseSizeMm?: number
  index?: number
}

export default function WatchRecommendation({
  brand,
  name,
  highlight,
  specs,
  reference,
  price,
  priceRange,
  movementType,
  caseSizeMm,
  index,
}: WatchRecommendationProps) {
  const displayPrice = price || priceRange
  const specParts = [movementType, caseSizeMm ? `${caseSizeMm}mm` : null, specs].filter(Boolean).join(' · ') || undefined
  return (
    <div className="card p-6 my-6">
      <div className="flex items-start gap-4">
        {typeof index === 'number' && (
          <div className="shrink-0 w-10 h-10 bg-subtle border border-line-strong rounded-full flex items-center justify-center">
            <span className="text-ink font-bold text-sm">{index}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs text-ink font-bold uppercase tracking-wider">{brand}</span>
            <span className="text-ink font-bold text-lg">{name}</span>
            {reference && <span className="text-xs text-faint">({reference})</span>}
          </div>
          {(specParts || displayPrice) && (
            <div className="flex flex-wrap gap-3 text-xs text-faint mb-3">
              {displayPrice && <span>{displayPrice}</span>}
              {specParts && <span>{specParts}</span>}
            </div>
          )}
          <p className="text-muted text-sm leading-relaxed mb-4">{highlight}</p>
        </div>
      </div>
    </div>
  )
}
