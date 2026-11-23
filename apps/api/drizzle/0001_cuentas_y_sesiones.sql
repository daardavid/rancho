CREATE TABLE "identity"."account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"usuario" text NOT NULL,
	"password_hash" text NOT NULL,
	"rol" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "account_rol_valido" CHECK ("identity"."account"."rol" in ('owner', 'support'))
);
--> statement-breakpoint
CREATE TABLE "identity"."login_attempt" (
	"id" uuid PRIMARY KEY NOT NULL,
	"usuario" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity"."session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"ranch_id" uuid NOT NULL,
	"rol" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "session_rol_valido" CHECK ("identity"."session"."rol" in ('owner', 'support'))
);
--> statement-breakpoint
ALTER TABLE "identity"."account" ADD CONSTRAINT "account_ranch_id_ranch_id_fk" FOREIGN KEY ("ranch_id") REFERENCES "identity"."ranch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."session" ADD CONSTRAINT "session_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "identity"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity"."session" ADD CONSTRAINT "session_ranch_id_ranch_id_fk" FOREIGN KEY ("ranch_id") REFERENCES "identity"."ranch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_usuario_unique" ON "identity"."account" USING btree ("usuario");--> statement-breakpoint
CREATE INDEX "login_attempt_usuario_ocurrido" ON "identity"."login_attempt" USING btree ("usuario","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_hash_unique" ON "identity"."session" USING btree ("token_hash");