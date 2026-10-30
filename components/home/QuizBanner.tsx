import Link from 'next/link'
import { Container } from '@/components/ui/Container'

export default function QuizBanner() {
  return (
    <section className="border-t border-line py-8">
      <Container>
        <p className="text-center text-sm text-muted">
          Not sure what to get?{' '}
          <Link
            href="/quiz"
            className="text-ink hover:text-ink-hover font-medium transition-colors"
          >
            Take the Watch Finder →
          </Link>
        </p>
      </Container>
    </section>
  )
}
