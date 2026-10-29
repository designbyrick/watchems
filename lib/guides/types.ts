export interface RankEntry {
  rank: number
  brand: string
  model: string
  price: string
  caseSize: string
  thickness: string
  movement: string
  crystal: string
  wr: string
  url?: string
  // Editorial copy, shown only when present. Never fill these with placeholder text.
  bestFor?: string
  reason?: string
  tradeoff?: string
  // Exact `GuideModel.name` in lib/buyingGuides.ts to take bestFor/reason/tradeoff from,
  // set only where that model's specs match this row
  guideModel?: string
}

export interface FaqEntry {
  question: string
  answer: string
}

export interface BuyingGuideConfig {
  slug: string
  title: string
  subtitle: string
  // One-line description for the guides index card
  summary: string
  // Price tier label, e.g. "Under $500"
  tier: string
  // Month the prices were last checked, e.g. "May 2026"
  lastVerified: string
  seoTitle: string
  seoDescription: string
  breadcrumbLabel: string
  heroImage: string
  sourcesNote: string
  ranking: RankEntry[]
  faq: FaqEntry[]
  articleJsonLd: Record<string, unknown>
}
