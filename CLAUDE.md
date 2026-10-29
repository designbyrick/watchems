# Watchems — Agent Rules

Read this before doing anything.

## Project
- Live at: https://watchems.com
- GitHub: https://github.com/danielclarke56/watchversus
- Stack: Next.js 14, TypeScript strict, Tailwind
- Deploy: Vercel (auto-deploys on push to master)
- **Do NOT auto-commit or push.** Make changes locally, let the user test, then commit only when asked.

## Hard Rules
- Affiliate links are allowed and encouraged — any affiliate network is permitted anywhere appropriate (buying guides, watch pages, brand pages, CTAs)
- NO social/community features — Watchems is a visual reference library, not a social platform
- TypeScript strict mode: no implicit any
- `data/watches.json` is DELETED — do not recreate it. Neon DB is the only source of truth.

## Architecture
- **Database**: Neon PostgreSQL via Drizzle ORM (`lib/db/`, `lib/db/schema.ts`)
- **Schema**: `photos`, `photoLikes`, `collections`, `collectionItems`, `users`, `wristChecks`
- **Auth**: Clerk (`@clerk/nextjs`)
- **Storage**: Cloudflare R2 for photo files (`lib/r2.ts`)
- **Email**: Resend for transactional emails (`lib/email.ts`)
  - Single-photo approval and rejection use **Resend hosted templates** (managed in the Resend dashboard), sent with `template: { id: TEMPLATES.x, variables }`
  - `watch-photo-live` (`TEMPLATES.photoApproved`) — `sendPhotoApprovedEmail()`; variables `firstName`, `slug`, `imageUrl`, `brand`, `model`, `reference`
  - `photo-rejected` (`TEMPLATES.photoRejected`) — `sendPhotoRejectedEmail()`; adds `reasonLabel`, `reasonDescription`, `customNote`, `photoCountNote`
  - Bulk approval (2+ photos) uses inline HTML in `sendPhotoBulkApprovedEmail()`
  - `lib/email-templates/*.html` are NOT read by any code — they're reference copies of the hosted templates. Editing them changes nothing; edit the template in Resend (and keep variable names in sync with `lib/email.ts`)
- **AI**: Google Gemini for watch identification (`lib/gemini.ts` or similar)
- **Rate limiting**: `lib/ratelimit.ts`
- **Buying Guides**: Static editorial data in `lib/buyingGuideData.ts` (typed `BuyingGuideData[]`). New guides are generated via `scripts/generate-guide.mjs` using `scripts/guide-instructions.md` as the prompt template. Guide components live in `components/guide/`.
- **CI**: GitHub Actions (`/.github/workflows/ci.yml`) runs build + lint on push to master before Vercel deploy gate.

## Key Pages
- `/` — Photo gallery (infinite scroll, filters, lightbox)
- `/photo/[id]` — Individual photo page
- `/upload` — Photo submission flow
- `/brand/[brand]` — Brand landing page
- `/w/[watchId]` — Watch detail page (dynamic slug routing)
- `/watches` — Watch browse/listing page
- `/style/[style]` — Style/category landing page
- `/styles` — Style browse page
- `/buying-guides` — Buying guides index
- `/buying-guide/[slug]` — Individual buying guide (data from `lib/buyingGuideData.ts`)
- `/about` — About page
- `/dashboard` — My Watches (user's submitted photos + stats)
- `/dashboard/wrist-check` — Daily wear logging with calendar
- `/dashboard/boards` — Collections (saved watches into themed boards)
- `/dashboard/liked` — Liked photos
- `/dashboard/profile` — Profile + avatar
- `/admin/photos` — Photo moderation queue (approve/reject/crop/reorder)
- `/admin/reviews` — Review moderation

## Watch Identity
There is NO watches table. A "watch" is identified by `watchId` (slug like `omega-seamaster-300m`) on the `photos` table. Watch metadata (brand, model, reference) lives on each photo record. When displaying watch name, derive from `[brandName, modelName].filter(Boolean).join(' ') || unslugify(watchId)`.

## Photo Approval Flow
- Admin approves a group of photos via `POST /api/admin/photos` with `action: 'bulk-approve'`
- Sends ONE summary email regardless of how many photos are in the batch
- Single photo batches use the `photo-approved.html` template
- Multi-photo batches use inline HTML with a photo list + dashboard nav links

## Architecture Rules (Learned from bugs)
- **Single source of truth**: Neon DB only. Never recreate static JSON data files.
- **Dynamic routing > static lists**: Use Next.js dynamic slug routing, don't manually register pages.
- **No static watch catalogue**: Watch identity is derived from photo submissions, not a predefined list.
- **`npm run validate` is removed** — the script that used watches.json is deleted.

## Buying Guide Rules
- Guide data lives in `lib/buyingGuideData.ts` — NOT in the DB
- Use `scripts/generate-guide.mjs` + `scripts/guide-instructions.md` to generate new guide entries
- `lib/priceData.ts` is DELETED — `lib/buyingGuideData.ts` is the replacement
- Internal links in guides can point to `/brand/` or `/style/` paths, or to affiliate URLs
- `images.hero` and `images.mid` in guide data are full URLs (Cloudflare R2 or external)

## DO NOT
- Ask about domain setup — already live at watchems.com
- Avoid adding affiliate links without a real URL — use placeholders only if explicitly asked
- Recreate `data/watches.json`, `lib/watches.ts`, or `lib/priceData.ts`
- Add social feed, follower, or community engagement features
- Create hardcoded lists that mirror data already in the DB
