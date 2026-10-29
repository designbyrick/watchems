CREATE TABLE "collection_items" (
	"id" text PRIMARY KEY NOT NULL,
	"collection_id" text NOT NULL,
	"photo_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collection_items_collection_id_photo_id_unique" UNIQUE("collection_id","photo_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guide_votes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"guide_slug" text NOT NULL,
	"watch_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guide_votes_user_id_guide_slug_unique" UNIQUE("user_id","guide_slug")
);
--> statement-breakpoint
CREATE TABLE "photo_likes" (
	"id" text PRIMARY KEY NOT NULL,
	"photo_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "photo_likes_photo_id_user_id_unique" UNIQUE("photo_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" text PRIMARY KEY NOT NULL,
	"watch_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"original_url" text,
	"brand_name" text,
	"model_name" text,
	"reference_number" text,
	"movement" text,
	"case_size" text,
	"wrist_size" text,
	"estimated_price" text,
	"lug_to_lug" text,
	"between_lugs" text,
	"thickness" text,
	"water_resistance" text,
	"dial_color" text,
	"bezel_color" text,
	"case_material" text,
	"strap_type" text,
	"watch_style" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"slug" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "photos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"clerk_id" text PRIMARY KEY NOT NULL,
	"terms_accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wrist_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"photo_id" text NOT NULL,
	"date" date NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wrist_checks_user_id_photo_id_date_unique" UNIQUE("user_id","photo_id","date")
);
--> statement-breakpoint
CREATE INDEX "collection_items_collection_id_idx" ON "collection_items" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "collection_items_photo_id_idx" ON "collection_items" USING btree ("photo_id");--> statement-breakpoint
CREATE INDEX "collections_user_id_idx" ON "collections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guide_votes_guide_slug_idx" ON "guide_votes" USING btree ("guide_slug");--> statement-breakpoint
CREATE INDEX "guide_votes_user_id_idx" ON "guide_votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "photo_likes_photo_id_idx" ON "photo_likes" USING btree ("photo_id");--> statement-breakpoint
CREATE INDEX "photo_likes_user_id_idx" ON "photo_likes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "photos_watch_id_idx" ON "photos" USING btree ("watch_id");--> statement-breakpoint
CREATE INDEX "photos_user_id_idx" ON "photos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "photos_status_idx" ON "photos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "photos_created_at_idx" ON "photos" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "photos_slug_idx" ON "photos" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "wrist_checks_user_id_idx" ON "wrist_checks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wrist_checks_user_date_idx" ON "wrist_checks" USING btree ("user_id","date");--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- Hand-written additions (not expressible in schema.ts). Carried over from
-- _legacy/0007_trgm_search_indexes.sql and _legacy/0008_compound_search_indexes.sql.
-- CONCURRENTLY is dropped because drizzle runs migrations inside a transaction.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photos_brand_trgm_idx" ON "photos" USING gin ("brand_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photos_model_trgm_idx" ON "photos" USING gin ("model_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photos_ref_trgm_idx" ON "photos" USING gin ("reference_number" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photos_watchid_trgm_idx" ON "photos" USING gin ("watch_id" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photos_status_created_idx" ON "photos" USING btree ("status","created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photos_watchid_status_idx" ON "photos" USING btree ("watch_id","status");
