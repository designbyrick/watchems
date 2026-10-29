# Database migrations

`lib/db/schema.ts` is the source of truth. Migrations live in `lib/db/migrations/`
and are applied with drizzle's migrator (`drizzle-kit migrate`).

## Layout

- `migrations/0000_baseline.sql` — the whole current schema in one file. Generated
  with `drizzle-kit generate` from `schema.ts`, plus a hand-written tail for things
  `schema.ts` cannot express (`pg_trgm` extension, trigram GIN indexes, compound
  `status, created_at DESC` / `watch_id, status` indexes).
- `migrations/meta/` — journal + snapshot drizzle-kit uses to diff `schema.ts`.
- `migrations/_legacy/` — the old, inconsistent migration history (0000–0012,
  duplicate numbers, journal out of sync, `guide_votes` never had a migration).
  Kept for reference only; drizzle ignores it. Do not add files there.

## Day to day

```bash
# after editing schema.ts
npx drizzle-kit generate --name <short_description>
# review the generated SQL, then apply
DATABASE_URL=... npx drizzle-kit migrate
```

Do not use `drizzle-kit push` against production — it bypasses the migration
history, which is how the history drifted in the first place.

Never edit a migration that has already been applied anywhere.

## New / empty database (test, staging, Neon branch from scratch)

```bash
DATABASE_URL=<empty db> npx drizzle-kit migrate
```

This creates every table and index from `0000_baseline.sql`.

## One-time step for the existing production database

Production already has all of this schema, created by the legacy migrations and
`drizzle-kit push`. Before the first `drizzle-kit migrate` against production,
the baseline must be recorded as already applied, otherwise drizzle would try to
run `CREATE TABLE "photos" ...` again and fail.

1. In the Neon console, create a branch (or backup) of the production database.
2. Check `guide_votes` exists: `SELECT to_regclass('public.guide_votes');` must
   not return NULL. If it does, stop — production is missing schema and needs a
   look before continuing.
3. Run this once (Neon SQL editor), on the branch first, then on production:

```sql
CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'f1634812f0b48000f57f6eef963ee47f63276133599e48ca204dd6831ae4e018', 1793309547404
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at >= 1793309547404
);
```

`hash` is the sha256 of `0000_baseline.sql`; `created_at` is its `when` in
`meta/_journal.json`. Drizzle decides what to run by comparing `created_at`, so
any older rows from the legacy history can stay. Afterwards,
`npx drizzle-kit migrate` against that database should apply nothing.

## Known drift between schema.ts and production

Replaying the legacy SQL (which approximates production) and diffing it against
the baseline shows these differences. None break the app today, but a future
migration touching these spots should account for them:

- `photos.production_year` still exists in production (removed from `schema.ts`).
- `users.terms_accepted_at`, `users.created_at` and `wrist_checks.created_at` are
  `timestamptz` in production, `timestamp` in `schema.ts`.
- The `wrist_checks` unique constraint is named
  `wrist_checks_user_photo_date_unique` in production and
  `wrist_checks_user_id_photo_id_date_unique` in the baseline.
- Column order inside `photos` differs (harmless).
