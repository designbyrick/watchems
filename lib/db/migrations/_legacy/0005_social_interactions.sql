-- Photo sort order + social interactions: photo likes, collections, collection items

ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "photo_likes" (
  "id" text PRIMARY KEY NOT NULL,
  "photo_id" text NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "photo_likes_photo_id_user_id_unique" UNIQUE("photo_id","user_id")
);

CREATE INDEX IF NOT EXISTS "photo_likes_photo_id_idx" ON "photo_likes" ("photo_id");
CREATE INDEX IF NOT EXISTS "photo_likes_user_id_idx" ON "photo_likes" ("user_id");

CREATE TABLE IF NOT EXISTS "collections" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "collections_user_id_idx" ON "collections" ("user_id");

CREATE TABLE IF NOT EXISTS "collection_items" (
  "id" text PRIMARY KEY NOT NULL,
  "collection_id" text NOT NULL,
  "photo_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "collection_items_collection_id_photo_id_unique" UNIQUE("collection_id","photo_id")
);

CREATE INDEX IF NOT EXISTS "collection_items_collection_id_idx" ON "collection_items" ("collection_id");
CREATE INDEX IF NOT EXISTS "collection_items_photo_id_idx" ON "collection_items" ("photo_id");
