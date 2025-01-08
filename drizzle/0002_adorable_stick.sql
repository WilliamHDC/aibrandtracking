ALTER TABLE "analysis_results" ALTER COLUMN "topic_id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "analysis_results" ALTER COLUMN "topic_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "competitors" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "brands" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "id" SET DATA TYPE serial;