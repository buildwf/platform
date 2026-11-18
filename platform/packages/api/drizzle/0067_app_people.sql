CREATE TABLE "app_people" (
	"client_id" text NOT NULL,
	"person_id" text NOT NULL,
	"plan" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_people_client_id_person_id_pk" PRIMARY KEY("client_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "app_usage" (
	"client_id" text NOT NULL,
	"person_id" text NOT NULL,
	"period" text NOT NULL,
	"ai_neurons" integer DEFAULT 0 NOT NULL,
	"sandbox_seconds" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "app_usage_client_id_person_id_period_pk" PRIMARY KEY("client_id","person_id","period")
);
--> statement-breakpoint
CREATE TABLE "app_usage_events" (
	"client_id" text NOT NULL,
	"event_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_usage_events_client_id_event_id_pk" PRIMARY KEY("client_id","event_id")
);
--> statement-breakpoint
ALTER TABLE "app_people" ADD CONSTRAINT "app_people_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_usage" ADD CONSTRAINT "app_usage_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_usage_events" ADD CONSTRAINT "app_usage_events_client_id_oauth_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_clients"("id") ON DELETE no action ON UPDATE no action;