import { Suspense } from 'react'
import GallerySearch from '@/components/home/GallerySearch'

/** Plain GET form shown until the interactive search mounts; also works without JS */
function SearchFallback() {
  return (
    <form
      role="search"
      action="/"
      method="get"
      className="flex items-center gap-2.5 sm:gap-3 h-12 sm:h-[60px] rounded-full bg-surface border border-line px-4 sm:px-[22px]"
    >
      <input
        type="search"
        name="q"
        aria-label="Search watches"
        placeholder="Search watches"
        className="flex-1 min-w-0 bg-transparent outline-none text-[15px] sm:text-base text-ink placeholder:text-muted"
      />
    </form>
  )
}

export default function HeroSearch({ heading = 'Every watch, on a real wrist.' }: { heading?: string }) {
  return (
    <section className="max-w-[1320px] mx-auto px-4 sm:px-8 pt-4 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-8">
        {/* Kept for SEO and screen readers on phones; the mobile layout leads with search */}
        <h1 className="sr-only sm:not-sr-only sm:flex-[1_1_520px] min-w-0 max-w-[720px] !text-[44px] lg:!text-[56px] !leading-[1.02] !font-semibold !tracking-display text-ink">
          {heading}
        </h1>
        <div className="flex-[1_1_100%] sm:flex-[1_1_440px] min-w-0 sm:max-w-[560px]">
          <Suspense fallback={<SearchFallback />}>
            <GallerySearch />
          </Suspense>
        </div>
      </div>
    </section>
  )
}
