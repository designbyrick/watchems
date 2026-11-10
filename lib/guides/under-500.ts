import type { BuyingGuideConfig, RankEntry } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// TOP 50 RANKING — community + trusted source consensus
// ─────────────────────────────────────────────────────────────────────────────

const RANKING: RankEntry[] = [
  { rank: 1,  brand: 'Seiko',    model: '5 Sports',                   price: '~$300', caseSize: '42.5mm', thickness: '13mm',    movement: 'Auto (4R36)',        crystal: 'Hardlex',  wr: '100m',  url: 'https://www.seikowatches.com/global-en/products/5sports' },
  { rank: 2,  brand: 'Orient',   model: 'Bambino',                    price: '~$250', caseSize: '38–42mm', thickness: '11mm',   movement: 'Auto (F6724)',        crystal: 'Mineral',  wr: '30m',   url: 'https://orient-watch.com/en/orient/collection/classic/', guideModel: 'Orient Bambino RA-AC0001S' },
  { rank: 3,  brand: 'Orient',   model: 'Kamasu',                     price: '~$375', caseSize: '41.8mm', thickness: '12.5mm',  movement: 'Auto (F6922)',        crystal: 'Sapphire', wr: '200m',  url: 'https://orient-watch.com/en/orient/collection/sports/' },
  { rank: 4,  brand: 'Seiko',    model: 'Presage Cocktail Time',      price: '~$450', caseSize: '40.5mm', thickness: '12.5mm',  movement: 'Auto (4R35)',         crystal: 'Sapphire', wr: '50m',   url: 'https://www.seikowatches.com/global-en/products/presage' },
  { rank: 5,  brand: 'Casio',    model: 'G-Shock DW-5600E',           price: '~$100', caseSize: '42.8mm', thickness: '13.4mm',  movement: 'Quartz (3232)',       crystal: 'Mineral',  wr: '200m',  url: 'https://www.casio.com/intl/watches/gshock/' },
  { rank: 6,  brand: 'Tissot',   model: 'PRX Quartz',                 price: '~$450', caseSize: '40mm',   thickness: '10.5mm',  movement: 'Quartz (ETA F06)',    crystal: 'Sapphire', wr: '100m',  url: 'https://www.tissotwatches.com/en-en/tissot-prx.html' },
  { rank: 7,  brand: 'Seiko',    model: '5 Sports (37mm)',            price: '~$200', caseSize: '37mm',   thickness: '11mm',    movement: 'Auto (7S26)',         crystal: 'Hardlex',  wr: '30m',   url: 'https://www.seikowatches.com/global-en/products/5sports' },
  { rank: 8,  brand: 'Citizen',  model: 'Promaster Diver',            price: '~$295', caseSize: '44mm',   thickness: '14mm',    movement: 'Solar (E168)',        crystal: 'Mineral',  wr: '200m',  url: 'https://www.citizenwatch-global.com/collection/promaster/', guideModel: 'Citizen Promaster Diver BN0150-28E' },
  { rank: 9,  brand: 'Orient',   model: 'Mako II',                    price: '~$285', caseSize: '41.5mm', thickness: '13mm',    movement: 'Auto (F6922)',        crystal: 'Mineral',  wr: '200m',  url: 'https://orient-watch.com/en/orient/collection/sports/' },
  { rank: 10, brand: 'Casio',    model: 'G-Shock GA-2100 CasiOak',   price: '~$110', caseSize: '45.4mm', thickness: '11.8mm',  movement: 'Ana-digi quartz',     crystal: 'Mineral',  wr: '200m',  url: 'https://www.casio.com/intl/watches/gshock/' },
  { rank: 11, brand: 'Seiko',    model: 'Prospex Solar Diver',        price: '~$425', caseSize: '38.5mm', thickness: '12mm',    movement: 'Solar (V157)',        crystal: 'Sapphire', wr: '200m',  url: 'https://www.seikowatches.com/global-en/products/prospex' },
  { rank: 12, brand: 'Timex',    model: 'Marlin Automatic',           price: '~$220', caseSize: '40mm',   thickness: '11mm',    movement: 'Auto (Miyota 8215)',  crystal: 'Acrylic',  wr: '30m',   url: 'https://www.timex.com/collections/marlin', guideModel: 'Timex Marlin TW2T22700' },
  { rank: 13, brand: 'Vostok',   model: 'Amphibia',                   price: '~$90',  caseSize: '40mm',   thickness: '13mm',    movement: 'Auto (2416B)',        crystal: 'Acrylic',  wr: '200m',  url: 'https://vostok-watches.ru/en/catalog/amphibia/' },
  { rank: 14, brand: 'Citizen',  model: 'Tsuyosa',                    price: '~$350', caseSize: '40mm',   thickness: '11.8mm',  movement: 'Auto (Miyota 8210)',  crystal: 'Sapphire', wr: '100m',  url: 'https://www.citizenwatch-global.com/collection/tsuyosa/' },
  { rank: 15, brand: 'Seiko',    model: '5 Sports GMT',               price: '~$495', caseSize: '42.5mm', thickness: '14mm',    movement: 'Auto GMT (4R34)',     crystal: 'Hardlex',  wr: '100m',  url: 'https://www.seikowatches.com/global-en/products/5sports', guideModel: 'Seiko 5 Sports GMT SSK001' },
  { rank: 16, brand: 'Seiko',    model: 'Prospex Samurai',            price: '~$395', caseSize: '43.8mm', thickness: '13mm',    movement: 'Auto (4R35)',         crystal: 'Hardlex',  wr: '200m',  url: 'https://www.seikowatches.com/global-en/products/prospex' },
  { rank: 17, brand: 'Orient',   model: 'Sun and Moon',               price: '~$450', caseSize: '42mm',   thickness: '13mm',    movement: 'Auto (F6B24)',        crystal: 'Mineral',  wr: '50m',   url: 'https://orient-watch.com/en/orient/collection/classic/' },
  { rank: 18, brand: 'Baltic',   model: 'HMS 002',                    price: '~$420', caseSize: '36.5mm', thickness: '10.5mm',  movement: 'Auto (Miyota 8215)',  crystal: 'Sapphire', wr: '50m',   url: 'https://baltic-watches.com/en/collections/hms' },
  { rank: 19, brand: 'Timex',    model: 'Q GMT',                      price: '~$199', caseSize: '38mm',   thickness: '11mm',    movement: 'Quartz GMT',          crystal: 'Acrylic',  wr: '50m',   url: 'https://www.timex.com/collections/q-timex' },
  { rank: 20, brand: 'Orient',   model: 'Ray II',                     price: '~$160', caseSize: '41.5mm', thickness: '12.5mm',  movement: 'Auto (F6922)',        crystal: 'Mineral',  wr: '200m',  url: 'https://orient-watch.com/en/orient/collection/sports/' },
]

// ─────────────────────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────────────────────

const EXTENDED_FAQ = [
  {
    question: 'Should I get an automatic or a quartz watch under $500?',
    answer: 'Quartz for function, automatic for sentiment. At this budget a $300 quartz watch typically has better finishing and accuracy than a $300 automatic — because the movement costs less to produce, more budget goes into the case and dial. A typical automatic drifts 5–15 seconds per day; a standard quartz loses maybe 15 seconds per month. If you care about the ritual of a mechanical movement — the sweeping hand, no battery, tactile winding — go automatic. If you just want a reliable daily watch, quartz wins.',
  },
  {
    question: 'Are automatics more accurate than quartz?',
    answer: 'No — this is the most common misconception in the hobby. A typical automatic at this price drifts 5–15 seconds per day; a standard quartz loses maybe 15 seconds per month. A high-accuracy solar quartz like Citizen Eco-Drive can be within seconds per year. Automatics are about craftsmanship and feel, not precision.',
  },
  {
    question: 'What movement should I look for in an automatic under $500?',
    answer: 'The most recommended movements at this price: Seiko NH35/NH38 (21,600 bph, hacking, hand-wind, globally serviceable, cheap parts), Miyota 9015 (28,800 bph for a smoother sweep, hacking, hand-wind, accurate out of the box), and ETA 2824-2 (Swiss-made, slightly more refined, but parts cost more). Community consensus: NH35 or Miyota 9015 are smarter choices than ETA 2824-2 at this budget — spending on a Swiss movement often means less budget left for case quality and crystal.',
  },
  {
    question: 'What does "hacking" mean and do I need it?',
    answer: 'Hacking means pulling the crown stops the seconds hand so you can set time precisely — without it, you can\'t synchronize to the second. Most good movements in this bracket hack. Some older Miyota 8215 variants do not. It\'s a real quality-of-life feature worth checking before buying.',
  },
  {
    question: 'Is Japanese or Swiss better at this price point?',
    answer: 'The community is near-unanimous: Japanese (Seiko, Orient, Citizen) offers better overall value below $500. A Swiss-made label adds $100–200 to the cost with diminishing material returns at this budget. Seiko\'s dial quality and finishing at $300–400 rivals Swiss watches costing $1,500. The Swiss-made premium makes more sense above $700–800.',
  },
  {
    question: 'Is the "Swiss Made" label worth paying a premium for under $500?',
    answer: '"Swiss Made" legally requires only 60% of manufacturing value to be Swiss — it does not guarantee better movement finishing, crystal quality, or case fit. Orient and Seiko at equivalent prices often have better fit and finish than similarly priced Tissot or Hamilton. The Swiss label matters more as a collector signal than a pure quality signal under $500.',
  },
  {
    question: 'What is the best automatic watch under $500?',
    answer: 'The Seiko 5 Sports SRPD55 (~$350) is the most versatile — day/date, 100m WR, proven 4R36 calibre, hundreds of colourways. For a complication, the Seiko 5 Sports GMT SSK001 (~$495) adds a mechanical GMT at a price Swiss brands charge $800+ for. For dress, the Orient Bambino (~$180). For value, the Orient Kamasu (~$200) gives sapphire crystal and 200m WR for less than the Seiko.',
  },
  {
    question: 'Seiko 5 Sports vs Orient Kamasu — which is better for a first watch?',
    answer: 'The Seiko 5 Sports is the safer all-rounder — 100m WR, day/date display, more colourway options, and a decade of enthusiast consensus behind it. The Kamasu has better dive specs (200m, sapphire, ceramic bezel) for less money, but fewer dial options. If you want a watch you can also use in water regularly, the Kamasu is arguably stronger value. If you want versatile daily wear, the Seiko.',
  },
  {
    question: 'What case size should I get for my wrist?',
    answer: 'The single most common regret-causing mistake is buying by diameter alone. Lug-to-lug (L2L) — the distance between the lug tips across your wrist — determines actual fit. A 42mm watch with long lugs can wear much larger than a 40mm with compact ones. Rough guide: L2L should be roughly 80–90% of your wrist width. For a 6-inch (155mm) wrist, 44–45mm L2L is a ceiling. Always check L2L before buying online.',
  },
  {
    question: 'What is a GADA watch and why does everyone recommend one for a first buy?',
    answer: 'GADA = "Go Anywhere, Do Anything." A watch versatile enough to wear to the office and the beach. The recommendation for first buyers is a GADA before branching into specialist watches. Top GADA picks under $500: Seiko 5 Sports SRPD series, Citizen Tsuyosa, Tissot PRX. They bridge casual and formal without looking out of place in either.',
  },
  {
    question: 'Does it matter if it has sapphire crystal vs. mineral glass?',
    answer: 'It matters for long-term ownership. Sapphire (rated 9 on Mohs hardness) resists everyday scratches from keys, desk surfaces, and sleeves that will mark mineral glass within months. Sapphire is more brittle under sharp direct impact, but wrist wear rarely produces that. Sapphire is now common under $500 — Orient, Citizen, Tissot all offer it below $400. For under $200, mineral glass is expected.',
  },
  {
    question: 'What is the difference between sapphire, Hardlex, and mineral crystal?',
    answer: 'Sapphire is the hardest watch crystal — highly scratch-resistant but chips under sharp impacts. Hardlex is Seiko\'s proprietary treated mineral glass — more impact-resistant than sapphire but scratches more easily; standard on Seiko 5 Sports and GMT lines. Mineral glass scratches under normal use. Acrylic is soft plastic — scratches easily but polishes out, used on the Timex Marlin for its vintage look. Quick rule: work with your hands → Hardlex. Want it to stay clear with minimal effort → sapphire.',
  },
  {
    question: 'How much water resistance do I actually need?',
    answer: '30m means splash-proof only — rain and handwashing, do not submerge. 50m is rated for light swimming in calm water, not active pool swimming. 100m is suitable for swimming, snorkelling, and daily beach wear — the minimum for anyone near water regularly. 200m+ is a proper dive rating. Important: WR ratings are static pressure tests — dynamic movement (jumping into a pool) multiplies effective pressure 3–4x, which is why 30m is splash-only in practice.',
  },
  {
    question: 'Does water resistance degrade over time?',
    answer: 'Yes. Gaskets and seals dry out and lose compression over time. A watch rated 100m when new may be effectively 30m after years of heavy use. Have it pressure-tested ($25–50 at any watchmaker) if you regularly swim with it, especially after any crown service or case opening. Never press pushers or unscrew the crown underwater.',
  },
  {
    question: 'Are microbrands worth the risk at this price?',
    answer: 'Mixed consensus. Reputable microbrands (Lorier, Nodus, Baltic, Traska) offer distinctive design and better specs-per-dollar than mainstream brands, often running NH35 or Miyota 9015. The risk: no heritage, uncertain longevity, and lower resale value (30–40% retained vs. 50–70% for Seiko/Tissot/Hamilton). Community advice: research the specific brand thoroughly, check owner forums, verify real customer service exists before buying.',
  },
  {
    question: 'Should I buy new or pre-owned under $500?',
    answer: 'Pre-owned is well regarded for established brands (Seiko, Tissot, Hamilton) because they have predictable service histories and strong parts availability. Buy from trusted sources — Chrono24, r/WatchExchange, or reputable local dealers — rather than unknown eBay listings. Inspect photos for crown condition (pushed-in crown can signal water damage), crystal chips, and bracelet stretch. Pre-owned Seiko references often represent significantly better value than equivalent new entry points.',
  },
  {
    question: 'Is the gray market safe for buying watches under $500?',
    answer: 'Gray-market dealers (Jomashop, etc.) sell genuine watches at 15–30% discounts by operating outside official brand distribution. Trade-off: manufacturer warranty is voided for most brands. Community consensus: for Seiko, Citizen, and Orient — where independent service costs are low — gray market is generally fine. For Tissot or Hamilton, the warranty has more practical value, so buy authorized during sales or with discount codes.',
  },
  {
    question: 'Do watches under $500 hold their value?',
    answer: 'Mostly no. Established brands (Seiko, Hamilton, Tissot) retain 50–70% of original retail on the secondary market. Microbrands retain 30–40%. No watch under $500 should be purchased as an investment. Exception: limited edition or discontinued Seiko references (SKX007, certain Presage dials) can hold or exceed retail on the pre-owned market due to strong collector demand.',
  },
  {
    question: 'Should I just save up and spend $800–1,000 instead?',
    answer: 'Honest community answer: if you know exactly what you want and the $800 watch genuinely excites you more, save up. But $500 is not a compromise — some of the most beloved watches in the hobby (Hamilton Khaki Field, Seiko 5 Sports, Tissot PRX) live in this bracket. Many experienced collectors say their most-worn watch is under $500. Buying a $300 watch you love is smarter than stretching to $1,000 on something you\'re unsure about.',
  },
  {
    question: 'What do I give up compared to the $500–$1,000 tier?',
    answer: 'Better bracelet finishing — end links, clasp mechanisms, tighter tolerances. Sapphire crystal on almost every model. COSC-certified movements (±4 sec/day). Cleaner case polishing and edge finishing. Movements in the under-$500 tier are equally durable — the differences are aesthetic, not mechanical.',
  },
  {
    question: 'Is a chronograph under $500 worth it, or is it a trap?',
    answer: 'Generally treated as a trap by experienced buyers advising newcomers. Cheap chronograph movements add complexity, cost more to service, and most people never actually use the stopwatch function. The community almost always recommends: get a clean three-hand watch first, understand what you actually use, then consider a chronograph. Exception: the Seagull 1963 Chronograph (~$250) is cited as an honest value if you genuinely want the complication.',
  },
  {
    question: 'Should I worry about bracelet quality at this price?',
    answer: 'Yes — bracelets are where most manufacturers cut corners under $500. A watch on a poor bracelet is uncomfortable and cheapens the whole package. Factor in $30–80 for an aftermarket strap or bracelet if needed. Most watches in this ranking wear better on leather, NATO, or rubber straps anyway, and changing straps is one of the most accessible ways to personalise a watch.',
  },
  {
    question: 'How do I change straps and is it difficult?',
    answer: 'Strap changing is one of the most accessible customisations in the hobby. Most watches with standard lug widths (18mm, 20mm, 22mm) accept any aftermarket strap — leather, NATO, rubber, mesh — for $15–60. You need a spring bar tool ($8–12) and a basic YouTube tutorial. Lug width is the critical spec to match when buying a replacement strap.',
  },
  {
    question: 'How often does an automatic watch need servicing and what does it cost?',
    answer: 'Manufacturer guidance is every 4–5 years. In practice, many NH35-based watches run 8–10 years without service if kept clean and away from salt water. Service cost from a qualified independent: $150–250 for a standard three-hand automatic. This is a real long-term cost to factor in. Quartz watches need only battery changes ($5–15 every 2–3 years) and are significantly cheaper to own over a decade.',
  },
  {
    question: 'Can I find a genuine ISO-certified dive watch under $500?',
    answer: 'Yes — the Citizen Promaster Diver BN0150 (~$295) is ISO 6425 certified with 200m WR and a solar movement that never needs a battery. The Glycine Combat Sub (~$350) is a Swiss-made 200m diver, though without ISO 6425 certification specifically.',
  },
  {
    question: 'Is a watch under $500 a "real" watch or will people think it\'s cheap?',
    answer: 'Most people cannot identify watch brands by sight. A well-chosen Seiko, Tissot, or Hamilton will read as a sharp, intentional accessory to anyone who isn\'t themselves a watch collector. A Hamilton Khaki Field or Seiko Presage worn with care will attract genuine compliments far beyond what the price tag warrants. The watch community explicitly discourages price-shaming — the most important thing is whether the watch means something to you.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const under500: BuyingGuideConfig = {
  slug: 'under-500',
  title: 'Best Watches Under $500',
  subtitle: 'What watch buyers actually recommend under $500. No editorial agenda. Prices verified May 2026.',
  summary: 'What watch buyers actually recommend under $500.',
  tier: 'Under $500',
  lastVerified: 'May 2026',
  seoTitle: 'Best Watches Under $500 (2026) — 20 Picks, Ranked',
  seoDescription: 'The 20 most recommended watches under $500, ranked by community consensus across r/Watches, WatchUSeek, and 17 sources. Verified prices, full specs, honest trade-offs.',
  breadcrumbLabel: 'Under $500',
  heroImage: '/images/guides/under-500-hero.png',
  sourcesNote: 'This ranking was compiled by the Watchems team by researching recommendation frequency across 19 sources including r/Watches, WatchUSeek, Worn & Wound, Teddy Baldassarre, Two Broke Watch Snobs, Fratello Watches, HiConsumption, Gear Patrol, and Time and Tide Watches. Rank order reflects how often each model appeared across those sources — not a live data pull. The list may be updated or modified by the Watchems team at any time. Last reviewed May 2026.',
  ranking: RANKING,
  faq: EXTENDED_FAQ,
  articleJsonLd: {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: 'Best Watches Under $500 — Community Ranking & Buying Guide',
    description: 'What watch buyers actually recommend under $500 — community consensus across every use case, with specs and real trade-offs.',
    url: 'https://watchems.com/buying-guide/under-500',
    datePublished: '2026-05-01',
    author: { '@type': 'Organization', name: 'Watchems Editorial', url: 'https://watchems.com' },
    publisher: { '@type': 'Organization', name: 'Watchems', url: 'https://watchems.com' },
  },
}
