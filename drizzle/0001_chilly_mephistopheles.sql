ALTER TABLE "analysis_results" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "id" SET DATA TYPE serial;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "brand" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "competitors" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "brands" text;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();