CREATE TABLE "project_credentials" (
	"project_id" text NOT NULL,
	"provider" text NOT NULL,
	"ciphertext" text NOT NULL,
	"iv" text NOT NULL,
	"key_version" text NOT NULL,
	"repositories" text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_credentials_project_id_provider_pk" PRIMARY KEY("project_id","provider")
);
--> statement-breakpoint
ALTER TABLE "project_credentials" ADD CONSTRAINT "project_credentials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;