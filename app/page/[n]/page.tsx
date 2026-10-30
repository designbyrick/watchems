import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import HeroSearch from '@/components/home/HeroSearch'
import PhotoGallery from '@/components/home/PhotoGallery'
import { getInitialPhotos, GALLERY_PAGE_SIZE } from '@/lib/getInitialPhotos'

// Crawlable pages of the home gallery (/page/2, /page/3, …), rendered on demand and cached (ISR)
// force-static lets lib/db's no-store fetch run during static generation instead of opting into dynamic rendering
export const dynamic = 'force-static'
export const revalidate = 300
export const dynamicParams = true

export function generateStaticParams() {
  return []
}

function parsePage(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return Number.isSafeInteger(n) && n >= 1 ? n : null
}

type GalleryPageProps = { params: Promise<{ n: string }> }

export async function generateMetadata(props: GalleryPageProps): Promise<Metadata> {
  const params = await props.params
  const page = parsePage(params.n)
  const url = `https://watchems.com/page/${params.n}`
  const title = `Watch Photo Gallery, Page ${page ?? params.n}`
  return {
    title,
    description: `Page ${page ?? params.n} of the Watchems community watch photo gallery: real wrist shots of watches at every price point, newest first.`,
    alternates: { canonical: url },
    openGraph: { title: `${title} | Watchems`, url },
  }
}

export default async function GalleryPage(props: GalleryPageProps) {
  const params = await props.params
  const page = parsePage(params.n)
  if (page === null) notFound()
  if (page === 1) permanentRedirect('/')

  const initial = await getInitialPhotos(page)
  // A failed query must not be cached as a 404; throwing keeps the last good ISR copy
  if (initial.totalCount === null) throw new Error(`Gallery page ${page} could not be loaded`)
  if (page > initial.totalPages) notFound()

  return (
    <div className="min-h-screen">
      <HeroSearch heading={`Watch photo gallery, page ${page}`} />
      <PhotoGallery initial={{ ...initial, pageSize: GALLERY_PAGE_SIZE }} />
    </div>
  )
}
