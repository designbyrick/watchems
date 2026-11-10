import type { BuyingGuideConfig, FaqEntry, RankEntry } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// RANKING
// ─────────────────────────────────────────────────────────────────────────────

const RANKING: RankEntry[] = [
  { rank: 1,  brand: 'Casio',   model: 'F-91W',                    price: '~$23',  caseSize: '38.5mm', thickness: '8.5mm',  movement: 'Quartz (2747)',          crystal: 'Mineral', wr: '30m',  url: 'https://www.casio.com/intl/watches/casio/product.F-91W-1/' },
  { rank: 2,  brand: 'Casio',   model: 'MDV-106 Duro',             price: '~$85',  caseSize: '44.5mm', thickness: '12.3mm', movement: 'Quartz',                 crystal: 'Mineral', wr: '200m', url: 'https://www.casio.com/intl/watches/casio/product.MDV-106-1AV/' },
  { rank: 3,  brand: 'Casio',   model: 'AE-1200 World Time',       price: '~$40',  caseSize: '45mm',   thickness: '11.7mm', movement: 'Quartz (3199)',          crystal: 'Mineral', wr: '100m', url: 'https://www.casio.com/intl/watches/casio/product.AE-1200WHD-1AV/' },
  { rank: 4,  brand: 'Timex',   model: 'Weekender',                price: '~$77',  caseSize: '38mm',   thickness: '10mm',   movement: 'Quartz (Indiglo)',        crystal: 'Acrylic', wr: '30m',  url: 'https://www.timex.com/collections/weekender' },
  { rank: 5,  brand: 'Casio',   model: 'G-Shock DW-5600E',         price: '~$99',  caseSize: '42.8mm', thickness: '13.4mm', movement: 'Quartz (3229)',          crystal: 'Mineral', wr: '200m', url: 'https://www.casio.com/intl/watches/gshock/product.DW-5600E-1V/' },
  { rank: 6,  brand: 'Casio',   model: 'A158WA Stainless',         price: '~$29',  caseSize: '33.5mm', thickness: '7mm',    movement: 'Quartz (2747)',          crystal: 'Mineral', wr: '30m',  url: 'https://www.casio.com/intl/watches/casio/product.A158WA-1/' },
  { rank: 7,  brand: 'Timex',   model: 'Expedition Scout',         price: '~$65',  caseSize: '40mm',   thickness: '11mm',   movement: 'Quartz (Indiglo)',        crystal: 'Mineral', wr: '50m',  url: 'https://www.timex.com/collections/expedition' },
  { rank: 8,  brand: 'Vostok',  model: 'Amphibia',                 price: '~$85',  caseSize: '40mm',   thickness: '13mm',   movement: 'Auto (2416B)',           crystal: 'Acrylic', wr: '200m', url: 'https://vostok-watches.ru/en/catalog/amphibia/' },
  { rank: 9,  brand: 'Timex',   model: 'Easy Reader',              price: '~$69',  caseSize: '35mm',   thickness: '8mm',    movement: 'Quartz (Indiglo)',        crystal: 'Mineral', wr: '30m',  url: 'https://www.timex.com/collections/easy-reader' },
  { rank: 10, brand: 'Casio',   model: 'MTP-1302 Analog',          price: '~$35',  caseSize: '41.5mm', thickness: '8.6mm',  movement: 'Quartz',                 crystal: 'Mineral', wr: '50m',  url: 'https://www.casio.com/us/watches/casio/product.MTP-1302D-1A1V/' },
  { rank: 11, brand: 'Casio',   model: 'G-Shock GW-M5610 Solar',   price: '~$99',  caseSize: '43.2mm', thickness: '12.7mm', movement: 'Solar/Multiband quartz', crystal: 'Mineral', wr: '200m', url: 'https://www.casio.com/intl/watches/gshock/product.GW-M5610U-1/' },
  { rank: 12, brand: 'Casio',   model: 'G-Shock DW-9052',          price: '~$60',  caseSize: '48.9mm', thickness: '15.1mm', movement: 'Quartz (3232)',          crystal: 'Mineral', wr: '200m', url: 'https://www.casio.com/intl/watches/gshock/' },
  { rank: 13, brand: 'Casio',   model: 'A100 Gold',                price: '~$60',  caseSize: '34.9mm', thickness: '8.2mm',  movement: 'Quartz',                 crystal: 'Mineral', wr: '30m',  url: 'https://www.casio.com/intl/watches/casio/' },
  { rank: 14, brand: 'Timex',   model: 'Ironman Classic 30',       price: '~$80',  caseSize: '43mm',   thickness: '14mm',   movement: 'Quartz (Indiglo)',        crystal: 'Mineral', wr: '100m', url: 'https://www.timex.com/collections/ironman' },
  { rank: 15, brand: 'Casio',   model: 'CA-53W Calculator',        price: '~$40',  caseSize: '36.3mm', thickness: '8.3mm',  movement: 'Quartz (calculator)',    crystal: 'Mineral', wr: '30m',  url: 'https://www.casio.com/intl/watches/casio/product.CA-53W-1/' },
  { rank: 16, brand: 'Casio',   model: 'MTP-V001 Dress',           price: '~$40',  caseSize: '37mm',   thickness: '9mm',    movement: 'Quartz',                 crystal: 'Mineral', wr: '30m',  url: 'https://www.casio.com/intl/watches/casio/product.MTP-V001D-1B/' },
  { rank: 17, brand: 'Timex',   model: 'MK1 Aluminum',             price: '~$60',  caseSize: '40mm',   thickness: '11mm',   movement: 'Quartz (Indiglo)',        crystal: 'Mineral', wr: '30m',  url: 'https://www.timex.com/collections/mk1' },
  { rank: 18, brand: 'Casio',   model: 'G-Shock GA-700',           price: '~$99',  caseSize: '51.6mm', thickness: '16.9mm', movement: 'Ana-digi quartz',        crystal: 'Mineral', wr: '200m', url: 'https://www.casio.com/us/watches/gshock/product.GA-700-1B/' },
  { rank: 19, brand: 'Casio',   model: 'MTP-VD01 Analog',          price: '~$25',  caseSize: '42mm',   thickness: '10mm',   movement: 'Quartz',                 crystal: 'Mineral', wr: '50m',  url: 'https://www.casio.com/us/watches/casio/product.MTP-VD01D-1BV/' },
  { rank: 20, brand: 'Casio',   model: 'G-Shock GD-350',           price: '~$85',  caseSize: '55mm',   thickness: '16.4mm', movement: 'Quartz',                 crystal: 'Mineral', wr: '200m', url: 'https://www.casio.com/intl/watches/gshock/' },
]

// ─────────────────────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────────────────────

const FAQ: FaqEntry[] = [
  {
    question: 'Is a $50 watch actually worth buying, or should I just save more?',
    answer: 'For most people, yes — $50 buys a genuinely reliable watch that will outlast many expensive ones. The Casio F-91W costs ~$20 and has run continuously for decades on a single battery. The engineering at this price tier is extremely mature — Casio, Timex, and Seiko have been perfecting these movements for 30–40 years. The trade-offs are aesthetic (plastic cases, mineral glass) not mechanical. If you need a daily beater, travel watch, or backup watch, under $100 makes perfect sense.',
  },
  {
    question: 'Are watches under $100 quartz only?',
    answer: 'Almost. The only automatic commonly recommended under $100 is the Vostok Amphibia (~$85), a Russian-made diver with a genuine automatic movement and 200m water resistance. Everything else at this price point is quartz — which is actually ideal. Quartz movements are more accurate, more shock-resistant, and require no winding or movement. At under $100, a well-made quartz beats a cheap automatic every time.',
  },
  {
    question: 'Casio vs Timex — which is better under $100?',
    answer: 'Different strengths. Casio dominates in durability, features, and water resistance — the G-Shock line at ~$70–99 is almost indestructible and includes 200m WR, shock protection, and illuminated displays. Timex wins on traditional aesthetics — the Weekender and Expedition look more like "watches" and less like sports electronics. If you need toughness, Casio. If you want something that can dress up slightly or looks more classic, Timex. Both have decades of proven reliability.',
  },
  {
    question: 'Is the Casio F-91W really that good?',
    answer: 'Yes — it is the most recommended watch in this bracket and possibly the most recommended budget watch ever made. At ~$23, it offers: reliable quartz timekeeping (accurate to ±15 sec/month), a stopwatch, alarm, day/date display, 30m water resistance, and LED illumination. The case is light and slim (8.5mm thick). Battery life is 7 years. It has been worn by presidents, astronauts, soldiers, and design students. Its main limitation: 30m WR means splash-proof, not swimming.',
  },
  {
    question: 'What is the best G-Shock for under $100?',
    answer: 'The DW-5600E-1V (~$99 MSRP, often under $60 street) is the most recommended — the direct descendant of the original 1983 G-Shock: square case, 200m WR, shock protection, alarm, stopwatch, backlight, 2-year battery. For large-display fans, the GA-700-1B (~$99) offers an oversized ana-digi face — the biggest readable dial in this price bracket. For maintenance-free operation, the GW-M5610U-1 (~$99) adds solar charging and Multiband 6 radio sync. The GA-2100-1A1 "CasiOak" lists at $110 MSRP and is not in this guide.',
  },
  {
    question: 'What does Indiglo mean on Timex watches?',
    answer: 'Indiglo is Timex\'s brand name for their electroluminescent backlight. Pressing a side button illuminates the entire dial in a uniform blue-green glow, making the watch readable in complete darkness without a single LED point. It is distinctly different from a standard LED dot or spot light — the whole face lights up. Indiglo is reliable, uses minimal battery, and is one of the main reasons Timex watches are popular as bedside, hiking, and camping watches.',
  },
  {
    question: 'Can I wear a $20 Casio to work or does it look cheap?',
    answer: 'It depends on your environment and how you carry it. In creative, tech, and casual offices, a Casio F-91W is widely recognised as intentional minimalism — it has cult status. In conservative professional settings (law, banking, formal client meetings), it will read as informal. The same $20 watch worn with confidence in the right environment draws compliments; worn with an apology in the wrong one, it draws scrutiny. The watch community\'s consistent advice: wear what suits your context and do it without hesitation.',
  },
  {
    question: 'What are the trade-offs compared to a $200–500 watch?',
    answer: 'Crystal quality — mineral glass scratches; sapphire does not. Case material — plastic or basic stainless at this price versus solid stainless above $150. Bracelet quality — inexpensive bracelets have more play. Movement finishing — no exhibition casebacks, no rotor weight on automatics. But accuracy, reliability, and durability are not significantly worse for a well-made quartz watch. A $23 Casio and a $500 Seiko will keep similar time. The differences are entirely about materials, finishing, and feel — not mechanical performance.',
  },
  {
    question: 'Is the Vostok Amphibia a reliable automatic under $100?',
    answer: 'It is the community\'s only serious automatic recommendation under $100, available new on Amazon for ~$80–$95. The Amphibia uses the Russian calibre 2416B — a robust movement with an unusual bayonet caseback design that tightens under water pressure, contributing to its genuine 200m dive rating. Trade-offs: accuracy is typical of budget automatics (±15–20 sec/day), the dial finishing is utilitarian, and the lugs can feel long on smaller wrists. The movement runs for years without service and the watch has a Soviet-era character that no Casio or Timex can match.',
  },
  {
    question: 'What is the best under-$100 watch for outdoor activities?',
    answer: 'G-Shock DW-5600E-1V for overall toughness — 200m WR, military-grade shock protection, alarm, stopwatch, 7-year battery. Casio MDV-106 Duro for swimming and water sports specifically — a dedicated diver-style watch with 200m WR for ~$85. Timex Expedition for hiking and camping — 50m WR, Indiglo backlight, field-watch aesthetics. The GW-M5610U-1 is worth considering for solar charging on extended outdoor trips.',
  },
  {
    question: 'Can I find a dress watch under $100?',
    answer: 'Yes. The Casio MTP-1302D (~$35) offers a slim 8.6mm profile, sunburst dial, and day/date display that reads well in business casual settings. The Timex Easy Reader T20501 (~$69) has clear large Arabic numerals and a classic round case on leather. The Casio MTP-V001D (~$40) is another clean analog option. None of these are dress watches by luxury standards, but they read as intentional and polished in most environments.',
  },
  {
    question: 'How long will a budget quartz watch last?',
    answer: 'Decades, with basic care. The Casio F-91W has been in continuous production since 1989 and original units from the early 90s are still running. Quartz movements have very few moving parts — the main failure modes are battery corrosion (replace batteries before they die to avoid leakage), water damage from failed seals, and physical impact damage to the crystal or case. There is no planned obsolescence in a well-made quartz watch.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const under100: BuyingGuideConfig = {
  slug: 'under-100',
  title: 'Best Watches Under $100',
  subtitle: 'What watch buyers actually recommend under $100. No editorial agenda. Prices verified May 2026.',
  summary: 'What watch buyers actually recommend under $100.',
  tier: 'Under $100',
  lastVerified: 'May 2026',
  seoTitle: 'Best Watches Under $100 (2026) — 20 Picks, Ranked',
  seoDescription: 'The 20 most recommended watches under $100, ranked by community consensus across r/Watches, WatchUSeek, and enthusiast forums. Verified prices, full specs, honest trade-offs.',
  breadcrumbLabel: 'Under $100',
  heroImage: '/images/guides/under-100-hero.png',
  sourcesNote: 'This ranking was compiled by the Watchems team by researching recommendation frequency across 14 sources including r/Watches, r/SuggestAWatch, WatchUSeek, Worn & Wound, Teddy Baldassarre, Two Broke Watch Snobs, HiConsumption, Gear Patrol, Cool Material, Gentleman\'s Gazette, The Time Bum, Dappered, WatchCompared, and The Modest Man. Prices verified against Casio.com, Timex.com, and Amazon in May 2026. Rank order reflects how often each model appeared across those sources — not a live data pull. The list may be updated or modified by the Watchems team at any time.',
  ranking: RANKING,
  faq: FAQ,
  articleJsonLd: {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: 'Best Watches Under $100 — Community Ranking & Buying Guide',
    description: 'The 20 most recommended watches under $100, ranked by community research.',
    url: 'https://watchems.com/buying-guide/under-100',
    datePublished: '2026-05-01',
    author: { '@type': 'Organization', name: 'Watchems Editorial', url: 'https://watchems.com' },
    publisher: { '@type': 'Organization', name: 'Watchems', url: 'https://watchems.com' },
  },
}
