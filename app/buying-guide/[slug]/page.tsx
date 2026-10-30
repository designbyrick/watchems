/**
 * Buying guide detail — /buying-guide/under-100, /under-500, /under-1000
 * Guide content lives in lib/guides; editorial extras come from lib/buyingGuides.
 */

export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import BuyingGuideTemplate from '@/components/guide/BuyingGuideTemplate'
import { getGuideConfig } from '@/lib/guides'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const guide = getGuideConfig(params.slug)
  if (!guide) return { title: 'Not Found | Watchems' }

  const url = `https://watchems.com/buying-guide/${guide.slug}`
  return {
    title: guide.seoTitle,
    description: guide.seoDescription,
    alternates: { canonical: url },
    openGraph: { title: guide.seoTitle, description: guide.seoDescription, url, type: 'article', siteName: 'Watchems', images: [guide.heroImage] },
    twitter: { card: 'summary_large_image', title: guide.seoTitle, description: guide.seoDescription },
  }
}

export default async function BuyingGuidePage(props: Props) {
  const params = await props.params
  const guide = getGuideConfig(params.slug)
  if (!guide) notFound()
  return <BuyingGuideTemplate config={guide} />
}
