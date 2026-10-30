CREATE TABLE "photos" (
	"id" text PRIMARY KEY NOT NULL,
	"watch_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"brand_name" text,
	"model_name" text,
	"reference_number" text,
	"movement" text,
	"case_size" text,
	"wrist_size" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "photos_watch_id_idx" ON "photos" USING btree ("watch_id");--> statement-breakpoint
CREATE INDEX "photos_user_id_idx" ON "photos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "photos_status_idx" ON "photos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "photos_created_at_idx" ON "photos" USING btree ("created_at");