import type { BuyingGuideConfig, RankEntry } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// RANKING
// ─────────────────────────────────────────────────────────────────────────────

const RANKING: RankEntry[] = [
  { rank: 1,  brand: 'Hamilton',         model: 'Khaki Field Mechanical',       price: '~$595',  caseSize: '38mm',   thickness: '9.5mm',  movement: 'Manual (Cal. H-50, 80hr)',      crystal: 'Sapphire',       wr: '50m',  url: 'https://www.hamiltonwatch.com/en-us/khaki-field-mechanical-watches' },
  { rank: 2,  brand: 'Tissot',           model: 'PRX Powermatic 80',            price: '~$850',  caseSize: '40mm',   thickness: '10.9mm', movement: 'Auto (Powermatic 80, 80hr)',    crystal: 'Sapphire',  wr: '100m', url: 'https://www.tissotwatches.com/en-us/collection/main-collections/tissot-prx.html' },
  { rank: 3,  brand: 'Hamilton',         model: 'Khaki Field Auto',             price: '~$795',  caseSize: '38mm',   thickness: '11.5mm', movement: 'Auto (Cal. H-10, 80hr)',        crystal: 'Sapphire',       wr: '100m', url: 'https://www.hamiltonwatch.com/en-us/khaki-field-mechanical-watches' },
  { rank: 4,  brand: 'Seiko',            model: 'Prospex Alpinist',             price: '~$725',  caseSize: '39.5mm', thickness: '13.2mm', movement: 'Auto (Cal. 6R35, 70hr)',        crystal: 'Sapphire',  wr: '200m', url: 'https://www.seikowatches.com/us-en/products/prospex' },
  { rank: 5,  brand: 'Certina',          model: 'DS Action Diver Powermatic 80', price: '~$795', caseSize: '38mm',   thickness: '13.2mm', movement: 'Auto (Powermatic 80, 80hr)',    crystal: 'Sapphire',  wr: '300m', url: 'https://www.certina.com/en/ds-action' },
  { rank: 6,  brand: 'Tissot',           model: 'Seastar 1000 Powermatic 80',   price: '~$875',  caseSize: '40mm',   thickness: '12.5mm', movement: 'Auto (Powermatic 80, 80hr)',    crystal: 'Sapphire',  wr: '300m', url: 'https://www.tissotwatches.com/en-us/collection/t-sport/tissot-t-sport-seastar-1000.html' },
  { rank: 7,  brand: 'Baltic',           model: 'Aquascaphe',                   price: '~$700',  caseSize: '39mm',   thickness: '13mm',   movement: 'Auto (Miyota 9039, 42hr)',      crystal: 'Sapphire',  wr: '200m', url: 'https://baltic-watches.com/en/collections/aquascaphe' },
  { rank: 8,  brand: 'Christopher Ward', model: 'C63 Sealander',                price: '~$895',  caseSize: '38mm',   thickness: '10mm',   movement: 'Auto (SH21 Cal. F210, 60hr)',   crystal: 'Sapphire',       wr: '150m', url: 'https://www.christopherward.com/int/watches' },
  { rank: 9,  brand: 'Tissot',           model: 'Gentleman Powermatic 80',      price: '~$950',  caseSize: '40mm',   thickness: '11.5mm', movement: 'Auto (Powermatic 80, 80hr)',    crystal: 'Sapphire',  wr: '100m', url: 'https://www.tissotwatches.com/en-us/collection/t-classic/tissot-t-classic-gentleman.html' },
  { rank: 10, brand: 'Nodus',            model: 'TrailTrekker Basecamp GMT',    price: '~$875',  caseSize: '39.5mm', thickness: '11.8mm', movement: 'Auto GMT (Miyota 9075, 42hr)',  crystal: 'Sapphire',       wr: '200m', url: 'https://www.noduswatches.com/trailtrekker' },
  { rank: 11, brand: 'Seiko',            model: "Presage Style 60's GMT",       price: '~$650',  caseSize: '40.8mm', thickness: '13mm',   movement: 'Auto GMT (Cal. 4R34, 41hr)',   crystal: 'Hardlex',        wr: '100m', url: 'https://www.seikowatches.com/us-en/products/presage' },
  { rank: 12, brand: 'Hamilton',         model: 'Khaki Field King Auto',        price: '~$795',  caseSize: '40mm',   thickness: '12mm',   movement: 'Auto (Cal. H-10, 80hr)',        crystal: 'Sapphire',       wr: '100m', url: 'https://www.hamiltonwatch.com/en-us/khaki-field-king-watches' },
  { rank: 13, brand: 'Seiko',            model: 'Prospex Alpinist (38mm)',      price: '~$725',  caseSize: '38mm',   thickness: '13.2mm', movement: 'Auto (Cal. 6R35, 70hr)',        crystal: 'Sapphire',  wr: '200m', url: 'https://www.seikowatches.com/us-en/products/prospex' },
  { rank: 14, brand: 'Seiko',            model: 'Prospex Slim Turtle',          price: '~$900',  caseSize: '41mm',   thickness: '12.3mm', movement: 'Auto (Cal. 6R35, 70hr)',        crystal: 'Sapphire',  wr: '200m', url: 'https://www.seikowatches.com/us-en/products/prospex' },
  { rank: 15, brand: 'Seiko',            model: 'Prospex Alpinist (GMT)',       price: '~$900',  caseSize: '39.5mm', thickness: '13.2mm', movement: 'Auto (Cal. 6R54, 72hr)',        crystal: 'Sapphire',  wr: '200m', url: 'https://www.seikowatches.com/us-en/products/prospex' },
  { rank: 16, brand: 'Lorier',           model: 'Hydra',                        price: '~$700',  caseSize: '36mm',   thickness: '12mm',   movement: 'Auto (Miyota 9039, 42hr)',      crystal: 'Sapphire',       wr: '200m', url: 'https://www.lorierwatches.com' },
  { rank: 17, brand: 'Hamilton',         model: 'Khaki Navy Scuba',             price: '~$975',  caseSize: '40mm',   thickness: '12.5mm', movement: 'Auto (Cal. H-10, 80hr)',        crystal: 'Sapphire',       wr: '200m', url: 'https://www.hamiltonwatch.com/en-us/khaki-navy-watches' },
  { rank: 18, brand: 'Hamilton',         model: 'Khaki Field Murph',            price: '~$995',  caseSize: '38mm',   thickness: '11.2mm', movement: 'Auto (Cal. H-10, 80hr)',        crystal: 'Sapphire',       wr: '100m', url: 'https://www.hamiltonwatch.com/en-us/khaki-field-murph-watches' },
  { rank: 19, brand: 'Bulova',           model: 'Lunar Pilot Chronograph',      price: '~$825',  caseSize: '45mm',   thickness: '13.5mm', movement: 'Quartz (262kHz high-freq.)',    crystal: 'Sapphire',       wr: '50m',  url: 'https://www.bulova.com/us/en/collection/lunar-pilot/' },
  { rank: 20, brand: 'Mido',             model: 'Ocean Star 200',               price: '~$980',  caseSize: '42.5mm', thickness: '13mm',   movement: 'Auto (Caliber 80, 80hr)',       crystal: 'Sapphire',  wr: '200m', url: 'https://www.midowatches.com/us/watches/collections/ocean-star/ocean-star-200.html' },
]

// ─────────────────────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    question: 'What is the best watch under $1,000?',
    answer: 'The Hamilton Khaki Field Mechanical 38mm (~$595) is the most consistently recommended watch in this range — it offers a Swiss-made manual-wind movement with an 80-hour power reserve, sapphire crystal, and field-watch heritage at a price well below $1,000. For those who prefer automatic winding, the Hamilton Khaki Field Auto and Tissot PRX Powermatic 80 are close seconds.',
  },
  {
    question: 'What should I expect at the $500–$1,000 price point?',
    answer: 'At this tier you should expect sapphire crystal (not mineral or hardlex), a Swiss or Japanese automatic movement with at least 40 hours of power reserve, solid water resistance (100m+), and finishing quality that holds up to close inspection. Brands at this level include Hamilton, Tissot, Seiko Prospex, Certina, and Christopher Ward — all offering manufacture-grade specs without the luxury markup.',
  },
  {
    question: 'Is a Swiss automatic worth it under $1,000?',
    answer: 'Yes — this price range is where Swiss automatics become genuinely compelling. The Tissot Powermatic 80 movement (used by Tissot and Certina) offers 80 hours of power reserve and silicon balance spring, which is exceptional for the price. Hamilton\'s Cal. H-10 is the same movement and equally impressive. You get real Swiss Made certification, in-house-adjacent movements, and long service intervals.',
  },
  {
    question: 'Hamilton vs Tissot at this price — which is better?',
    answer: 'They share the same ETA/Swatch Group movement DNA so the movement quality is comparable. Hamilton\'s advantage is design heritage (American military history, Interstellar) and slightly lower prices. Tissot\'s advantage is the PRX\'s integrated bracelet and dressy versatility, and the Seastar 1000\'s 300m diver spec. Both are excellent — choose by style preference.',
  },
  {
    question: 'What is the best dive watch under $1,000?',
    answer: 'The Certina DS Action Diver Powermatic 80 (~$795) is the standout: ISO 6425 certified, 300m water resistance, ceramic bezel insert, Powermatic 80 movement, and sapphire crystal at a price most dive watches can\'t touch. The Tissot Seastar 1000 (~$875) is a close second. For something smaller (38mm), both are significantly better dive tools than the Seiko Prospex line at this price.',
  },
  {
    question: 'Should I buy a Seiko Prospex or a Hamilton at this price?',
    answer: 'Different strengths. Seiko Prospex (Alpinist, Slim Turtle) offers Japanese-made movements, proven tool watch credentials, and strong resale communities. Hamilton offers Swiss Made certification, longer power reserves (80hr vs 70hr), and arguably better finishing for the price. If outdoor/adventure aesthetics matter, Seiko. If dress-casual versatility and Swiss provenance matter, Hamilton.',
  },
  {
    question: 'Are microbrands like Baltic and Nodus worth considering at this price?',
    answer: 'Yes, particularly Baltic and Nodus. Both source quality Swiss/Japanese movements (Miyota 9039 or 9075), use sapphire crystals, and offer design and specifications that compete with established brands at 2–3x the price. The trade-off is lower brand recognition and resale value. Baltic\'s Aquascaphe (~$700) and Nodus\'s TrailTrekker GMT (~$875) are genuine enthusiast favourites with strong community backing.',
  },
  {
    question: 'What power reserve should I expect?',
    answer: 'At this price tier, 42–80 hours is standard. The Tissot/Certina Powermatic 80 and Hamilton H-10 both offer 80 hours — exceptional by any measure, meaning you can leave the watch off for the weekend and it will still be running Monday. Miyota movements (Baltic, Nodus, Lorier) offer ~42 hours. Seiko\'s 6R35 offers 70 hours. All are sufficient for daily wear with comfortable margin.',
  },
  {
    question: 'Is the Tissot PRX worth the premium over the Tissot PRX quartz?',
    answer: 'The automatic PRX Powermatic 80 (~$850) adds the 80hr movement, a sweeping seconds hand, and significantly more wrist presence to the quartz (~$450). If you care about the mechanical experience and don\'t need battery changes, yes — the premium is worth it. If you prioritize accuracy and don\'t mind quartz, the cheaper version is technically a better timekeeper.',
  },
  {
    question: 'What about Christopher Ward — is it a good alternative to Swiss heritage brands?',
    answer: 'Christopher Ward is UK-based and sells direct-to-consumer, which lets them offer Swiss Made watches (using in-house and ETA-based movements) at better value than retail-distributed competitors. The C63 Sealander Automatic at ~$895 uses a Sellita-based SH21 movement with 60hr power reserve. The trade-off is lower brand recognition outside watch enthusiast circles and limited pre-owned market liquidity.',
  },
  {
    question: 'Will watches in this range hold their value?',
    answer: 'Most will not appreciate, but well-known references (Hamilton Khaki Field, Seiko Prospex Alpinist) hold resale value reasonably well due to strong enthusiast communities and consistent demand. Microbrands (Baltic, Nodus, Lorier) tend to have thinner pre-owned markets. Buying at retail rather than grey market means you have less downside exposure. In general, buy to wear — not to invest — at this price tier.',
  },
  {
    question: 'What is the best GMT watch under $1,000?',
    answer: 'The Seiko Presage GMT SSK009J1 (~$650) is the most accessible GMT at this price — automatic, two time zones, retro dial design. The trade-off is Hardlex crystal (not sapphire) and a 41hr power reserve. The Nodus TrailTrekker Basecamp GMT (~$875) steps up to sapphire crystal and a Miyota 9075 GMT movement at a higher price. Both offer genuine GMT functionality, unlike some watches that only track a second timezone via a 24hr bezel.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const under1000: BuyingGuideConfig = {
  slug: 'under-1000',
  title: 'Best Watches Under $1,000',
  subtitle: 'The most recommended watches between $500 and $1,000. Community-researched, prices verified May 2026. No sponsored picks.',
  summary: 'The most recommended watches between $500 and $1,000.',
  tier: '$500 – $1,000',
  lastVerified: 'May 2026',
  seoTitle: 'Best Watches Under $1,000 (2026) — 20 Picks, Ranked',
  seoDescription: 'The 20 most recommended watches under $1,000, ranked by community consensus across r/Watches, WatchUSeek, Fratello, and 5 other sources. Verified prices, full specs, honest trade-offs.',
  breadcrumbLabel: 'Under $1,000',
  heroImage: '/images/guides/under-1000-hero.png',
  sourcesNote: 'This ranking was compiled by the Watchems team by researching recommendation frequency across sources including r/Watches, WatchUSeek, Worn & Wound, Teddy Baldassarre, Two Broke Watch Snobs, Fratello Watches, and Gear Patrol. Rank order reflects how often each model appeared across those sources — not a live data pull. Prices verified against brand international sites and Amazon US in May 2026.',
  ranking: RANKING,
  faq: FAQ,
  articleJsonLd: {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: 'Best Watches Under $1,000 — Community Ranking & Buying Guide',
    description: 'The most recommended watches between $500 and $1,000, ranked by community research across r/Watches, WatchUSeek, Fratello, Worn & Wound, and more.',
    url: 'https://watchems.com/buying-guide/under-1000',
    datePublished: '2026-05-05',
    author: { '@type': 'Organization', name: 'Watchems Editorial', url: 'https://watchems.com' },
    publisher: { '@type': 'Organization', name: 'Watchems', url: 'https://watchems.com' },
  },
}
