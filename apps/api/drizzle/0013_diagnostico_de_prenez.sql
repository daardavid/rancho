CREATE TABLE "herd"."pregnancy_check_correction" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"pregnancy_check_id" uuid NOT NULL,
	"field" text NOT NULL,
	"previous_value" text,
	"reason" text NOT NULL,
	"corrected_by" text NOT NULL,
	"corrected_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pregnancy_check_correction_campo_valido" CHECK ("herd"."pregnancy_check_correction"."field" in ('resultado', 'fecha', 'reportedBy', 'nota', 'vioAlAnimal')),
	CONSTRAINT "pregnancy_check_correction_motivo_presente" CHECK (length(btrim("herd"."pregnancy_check_correction"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "herd"."pregnancy_check" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"animal_id" uuid NOT NULL,
	"occurred_on" date NOT NULL,
	"result" text NOT NULL,
	"reported_by" text,
	"note" text,
	"saw_animal" boolean,
	"version" integer NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pregnancy_check_resultado_valido" CHECK ("herd"."pregnancy_check"."result" in ('prenada', 'vacia', 'no_se')),
	CONSTRAINT "pregnancy_check_reported_by_presente" CHECK ("herd"."pregnancy_check"."reported_by" is null or length(btrim("herd"."pregnancy_check"."reported_by")) > 0),
	CONSTRAINT "pregnancy_check_nota_presente" CHECK ("herd"."pregnancy_check"."note" is null or length(btrim("herd"."pregnancy_check"."note")) > 0),
	CONSTRAINT "pregnancy_check_version_positiva" CHECK ("herd"."pregnancy_check"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "herd"."pregnancy_check_correction" ADD CONSTRAINT "pregnancy_check_correction_pregnancy_check_id_pregnancy_check_id_fk" FOREIGN KEY ("pregnancy_check_id") REFERENCES "herd"."pregnancy_check"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herd"."pregnancy_check" ADD CONSTRAINT "pregnancy_check_animal_id_animal_id_fk" FOREIGN KEY ("animal_id") REFERENCES "herd"."animal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pregnancy_check_correction_diag" ON "herd"."pregnancy_check_correction" USING btree ("pregnancy_check_id","corrected_at");--> statement-breakpoint
CREATE INDEX "pregnancy_check_animal" ON "herd"."pregnancy_check" USING btree ("animal_id","occurred_on");--> statement-breakpoint
CREATE INDEX "pregnancy_check_ranch_fecha" ON "herd"."pregnancy_check" USING btree ("ranch_id","occurred_on");