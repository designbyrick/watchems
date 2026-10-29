'use client'

import GallerySearch from '@/components/home/GallerySearch'

export default function HeroSearch() {
  return (
    <section className="max-w-[1320px] mx-auto px-4 sm:px-8 pt-4 sm:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-8">
        {/* Kept for SEO and screen readers on phones; the mobile layout leads with search */}
        <h1 className="sr-only sm:not-sr-only sm:flex-[1_1_520px] min-w-0 max-w-[720px] !text-[44px] lg:!text-[56px] !leading-[1.02] !font-semibold !tracking-display text-ink">
          Every watch, on a real wrist.
        </h1>
        <div className="flex-[1_1_100%] sm:flex-[1_1_440px] min-w-0 sm:max-w-[560px]">
          <GallerySearch />
        </div>
      </div>
    </section>
  )
}
