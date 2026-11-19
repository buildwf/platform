ALTER TABLE "projects" ALTER COLUMN "mode" SET DEFAULT 'platform';--> statement-breakpoint
UPDATE "projects" SET "mode" = 'platform' WHERE "mode" = 'nosam';
