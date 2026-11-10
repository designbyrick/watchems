# Watchems — Project Context

Use this document to give an LLM enough context to help with the project.

---

## What is Watchems?

Watchems (watchems.com) is a **visual reference library for watches**. People submit real wrist-shot photos of watches they own. An admin approves them. The approved photos become the reference gallery.

It is **not** a social platform. No follower system, no community feed. The model is closer to IMDB or Discogs — a small group of contributors builds a definitive resource that benefits many readers.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript strict |
| Styling | Tailwind CSS |
| Database | Neon PostgreSQL via Drizzle ORM |
| Auth | Clerk |
| File storage | Cloudflare R2 |
| Email | Resend (transactional) |
| AI | Google Gemini (watch identification) |
| Deploy | Vercel (auto-deploy on push to `master`) |

---

## Database Schema

There is **no watches table**. A watch is identified by a `watchId` slug (e.g. `omega-seamaster-300m`) on the `photos` table. All watch metadata lives on individual photo records.

### `photos`
The core table. Key fields:
- `id`, `watchId` (slug), `userId`, `userName`
- `url`, `thumbnailUrl`, `originalUrl`
- `brandName`, `modelName`, `referenceNumber`
- `movement`, `caseSize`, `wristSize`, `estimatedPrice`, `productionYear`
- `lugToLug`, `betweenLugs`, `thickness`, `waterResistance`
- `dialColor`, `bezelColor`, `caseMaterial`, `strapType`, `watchStyle` (AI-detected)
- `status` — `pending | approved | rejected`
- `rejectionReason`, `sortOrder`, `slug` (SEO slug), `createdAt`

### Other tables
- `photoLikes` — `photoId + userId` (unique)
- `collections` — `userId + name` (boards/wishlists)
- `collectionItems` — `collectionId + photoId`
- `users` — `clerkId`, `termsAcceptedAt`
- `wristChecks` — `userId`, `photoId`, `date`, `notes`

---

## Key Pages

| Route | Purpose |
|---|---|
| `/` | Photo gallery — infinite scroll, filters, lightbox |
| `/photo/[id]` | Individual photo detail page |
| `/upload` | Photo submission flow |
| `/dashboard` | My Watches — user's submitted photos + like/save stats |
| `/dashboard/wrist-check` | Daily wear logging with calendar view |
| `/dashboard/boards` | Collections — save watches into themed boards |
| `/dashboard/liked` | Liked photos |
| `/dashboard/profile` | Profile + avatar |
| `/admin/photos` | Admin moderation queue (approve/reject/crop/reorder) |
| `/learn`, `/learn/[slug]` | Organic-traffic posts (`content/posts/`, `new-post` skill) |

---

## Key API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/photos/all` | GET | All approved photos, paginated, filterable |
| `/api/photos/related` | GET | Related photos for a given watchId |
| `/api/photos/watches` | GET | Distinct watches with approved photos + brand aggregations |
| `/api/admin/photos` | GET/POST/PATCH/PUT | Admin: list, approve, reject, update metadata, reorder |
| `/api/upload` | POST | Photo upload to R2 |

---

## Photo Approval Flow

1. User submits photos via `/upload`
2. Photos land in DB with `status: pending`
3. Admin reviews in `/admin/photos` — can edit metadata, crop, reorder
4. Admin approves a group → `POST /api/admin/photos` with `action: bulk-approve`, `watchId`, `photoIds[]`
5. All photos approved in one DB update
6. **One summary email** sent to the submitter (never one per photo)
7. If rejected → rejection email with a predefined reason + optional note

---

## Email System

All email via **Resend**. Key file: `lib/email.ts`.

- **Approval (single photo):** Uses `lib/email-templates/photo-approved.html`. Variables: `{{firstName}}`, `{{slug}}`, `{{imageUrl}}`, `{{brand}}`, `{{model}}`, `{{reference}}`
- **Approval (2+ photos):** Inline HTML in `sendPhotoBulkApprovedEmail()` — lists all approved photos with dashboard nav links
- **Rejection:** Resend managed template `photo-rejected` — includes reason label, description, optional admin note

---

## Key Library Files

| File | Purpose |
|---|---|
| `lib/db/schema.ts` | Drizzle schema definitions |
| `lib/db/index.ts` | DB connection |
| `lib/email.ts` | All email sending functions |
| `lib/photos.ts` | Photo type definitions and helpers |
| `lib/admin.ts` | Admin user check |
| `lib/r2.ts` | Cloudflare R2 upload/delete |
| `lib/ratelimit.ts` | Rate limiting for API routes |
| `lib/validation.ts` | Slug validation helpers |
| `lib/rejectionReasons.ts` | Predefined rejection reason list |

---

## What Was Removed

These things **no longer exist** — don't suggest recreating them:

- `data/watches.json` — static watch catalogue (deleted 2026-04-13)
- `lib/watches.ts` — static watch lookup functions
- `lib/comparisons.ts`, `lib/relatedContent.ts` — comparison scoring
- `app/quiz/` — watch quiz feature
- `scripts/validate-integrity.ts`, `scripts/generate-pairs.ts`
- `npm run validate` and `npm run generate-pairs` scripts

---

## Hard Rules

- Affiliate links are allowed (see `CLAUDE.md`), but the site still says "no affiliate links" in public copy; change that copy before adding any
- No social/community features
- `data/watches.json` must not be recreated — Neon DB is the only source of truth
- TypeScript strict mode — no implicit `any`
- Bulk photo approvals always send **one** email, never one per photo
