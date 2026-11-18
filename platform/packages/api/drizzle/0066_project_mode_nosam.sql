ALTER TABLE "github_connections" ALTER COLUMN "workflow_path" SET DEFAULT '.github/workflows/bwf-deploy.yml';--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "mode" SET DEFAULT 'nosam';--> statement-breakpoint
UPDATE "projects" SET "mode" = 'nosam' WHERE "mode" = 'void';
