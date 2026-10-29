import Link from 'next/link'
import { Container } from '@/components/ui/Container'

interface ReviewData {
  id: string
  watchSlug: string
  rating: number
  title: string
  body: string
  userName?: string
  userId?: string
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400 text-sm">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>{i < rating ? '★' : '☆'}</span>
      ))}
    </span>
  )
}

const placeholderReviews: ReviewData[] = [
  {
    id: 'placeholder-1',
    watchSlug: 'omega-speedmaster-moonwatch',
    rating: 5,
    title: 'The one watch everyone should own',
    body: 'Wore this daily for three years and it still looks incredible. The hesalite crystal gives it that vintage warmth that sapphire just cannot replicate.',
    userName: 'James',
  },
  {
    id: 'placeholder-2',
    watchSlug: 'tudor-black-bay-58',
    rating: 4,
    title: 'Perfect daily diver at a fair price',
    body: 'Coming from a Submariner, I was sceptical. But the 39mm case sits so well on my wrist and the in-house movement is punching above its weight.',
    userName: 'Michael',
  },
]

interface OwnerReviewsProps {
  reviews: ReviewData[]
}

export default function OwnerReviews({ reviews }: OwnerReviewsProps) {
  const displayReviews = reviews.length > 0 ? reviews.slice(0, 4) : placeholderReviews
  const isPlaceholder = reviews.length === 0

  return (
    <section className="py-12 md:py-14">
      <Container>
        <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-8">
          What Owners Say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayReviews.map((review) => {
            const displayName = review.userName || 'Anonymous'
            const truncatedBody =
              review.body.length > 120
                ? review.body.slice(0, 120) + '...'
                : review.body
            const watchLabel = review.watchSlug.replace(/-/g, ' ')

            return (
              <Link
                key={review.id}
                href={`/watches/${review.watchSlug}`}
                className="block bg-surface border border-line rounded-sm p-5 hover:border-line-strong transition-colors"
              >
                <StarRating rating={review.rating} />
                <p className="text-sm text-muted mt-2 mb-3">
                  &ldquo;{truncatedBody}&rdquo;
                </p>
                <div className="flex items-center justify-between text-xs text-faint">
                  <span>{displayName}</span>
                  <span className="capitalize">{watchLabel}</span>
                </div>
              </Link>
            )
          })}
        </div>
        {isPlaceholder && (
          <p className="text-center text-sm text-faint mt-4">
            Be the first to review — visit any watch page to share your experience.
          </p>
        )}
      </Container>
    </section>
  )
}
