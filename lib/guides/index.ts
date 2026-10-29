import type { BuyingGuideConfig } from './types'
import { under100 } from './under-100'
import { under500 } from './under-500'
import { under1000 } from './under-1000'

export type { BuyingGuideConfig, RankEntry, FaqEntry } from './types'

// Every live buying guide, in budget order. Served by app/buying-guide/[slug].
export const GUIDES: BuyingGuideConfig[] = [under100, under500, under1000]

export function getGuideConfig(slug: string): BuyingGuideConfig | undefined {
  return GUIDES.find((g) => g.slug === slug)
}

// Shared metadata for the guides index and cross-links
export interface GuideSummary {
  slug: string
  title: string
  summary: string
  tier: string
  heroImage: string
  pickCount: number
  lastVerified: string
}

export function getGuideSummaries(): GuideSummary[] {
  return GUIDES.map((g) => ({
    slug: g.slug,
    title: g.title,
    summary: g.summary,
    tier: g.tier,
    heroImage: g.heroImage,
    pickCount: g.ranking.length,
    lastVerified: g.lastVerified,
  }))
}
