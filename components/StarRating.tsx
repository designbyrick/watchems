interface Props {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  showNumber?: boolean
}

export default function StarRating({ rating, size = 'md', showNumber = false }: Props) {
  const sizes = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-5 h-5' }
  const starSize = sizes[size]
  const fullStars = Math.floor(rating)
  const partial = rating - fullStars
  const emptyStars = 5 - fullStars - (partial > 0 ? 1 : 0)

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: fullStars }).map((_, i) => (
          <svg key={`f${i}`} className={`${starSize} text-ink fill-current`} viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
        {partial > 0 && (
          <svg className={`${starSize} text-ink`} viewBox="0 0 24 24">
            <defs>
              <linearGradient id={`partial-${Math.round(partial * 10)}`}>
                <stop offset={`${partial * 100}%`} stopColor="#5C5C5C" />
                <stop offset={`${partial * 100}%`} stopColor="#E2E8F0" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#partial-${Math.round(partial * 10)})`}
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <svg key={`e${i}`} className={`${starSize} text-line fill-current`} viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
      {showNumber && (
        <span className="text-sm text-muted ml-1">{rating.toFixed(1)}</span>
      )}
    </div>
  )
}
