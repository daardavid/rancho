CREATE SCHEMA "growth";
--> statement-breakpoint
CREATE SCHEMA "herd";
--> statement-breakpoint
CREATE SCHEMA "identity";
--> statement-breakpoint
CREATE TABLE "identity"."ranch" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "command_idempotency" (
	"command_id" uuid PRIMARY KEY NOT NULL,
	"fingerprint" text NOT NULL,
	"result" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
