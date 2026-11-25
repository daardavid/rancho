CREATE TABLE "herd"."parentage_correction" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"parentage_id" uuid NOT NULL,
	"offspring_id" uuid NOT NULL,
	"previous_dam_certainty" text NOT NULL,
	"previous_dam_id" uuid,
	"previous_dam_reason" text,
	"previous_sire_certainty" text NOT NULL,
	"previous_sire_id" uuid,
	"previous_sire_reason" text,
	"previous_note" text,
	"previous_birth_date" date,
	"previous_birth_date_precision" text,
	"reason" text NOT NULL,
	"corrected_by" text NOT NULL,
	"corrected_at" timestamp with time zone NOT NULL,
	CONSTRAINT "parentage_correction_motivo" CHECK (length(btrim("herd"."parentage_correction"."reason")) > 0),
	CONSTRAINT "parentage_correction_dam_certainty" CHECK ("herd"."parentage_correction"."previous_dam_certainty" in ('observed', 'inferred', 'unknown')),
	CONSTRAINT "parentage_correction_sire_certainty" CHECK ("herd"."parentage_correction"."previous_sire_certainty" in ('observed', 'inferred', 'unknown'))
);
--> statement-breakpoint
CREATE TABLE "herd"."parentage_record" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"offspring_id" uuid NOT NULL,
	"dam_certainty" text NOT NULL,
	"dam_id" uuid,
	"dam_reason" text,
	"sire_certainty" text NOT NULL,
	"sire_id" uuid,
	"sire_reason" text,
	"note" text,
	"birth_date" date,
	"birth_date_precision" text,
	"version" integer NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "parentage_dam_certainty" CHECK ("herd"."parentage_record"."dam_certainty" in ('observed', 'inferred', 'unknown')),
	CONSTRAINT "parentage_sire_certainty" CHECK ("herd"."parentage_record"."sire_certainty" in ('observed', 'inferred', 'unknown')),
	CONSTRAINT "parentage_dam_unknown_id" CHECK (("herd"."parentage_record"."dam_certainty" = 'unknown') = ("herd"."parentage_record"."dam_id" is null)),
	CONSTRAINT "parentage_sire_unknown_id" CHECK (("herd"."parentage_record"."sire_certainty" = 'unknown') = ("herd"."parentage_record"."sire_id" is null)),
	CONSTRAINT "parentage_dam_inferred_reason" CHECK (("herd"."parentage_record"."dam_certainty" = 'inferred') = ("herd"."parentage_record"."dam_reason" is not null)),
	CONSTRAINT "parentage_sire_inferred_reason" CHECK (("herd"."parentage_record"."sire_certainty" = 'inferred') = ("herd"."parentage_record"."sire_reason" is not null)),
	CONSTRAINT "parentage_dam_reason_valida" CHECK ("herd"."parentage_record"."dam_reason" is null or "herd"."parentage_record"."dam_reason" in ('parto_visto', 'dicho_de_trabajador', 'otro')),
	CONSTRAINT "parentage_sire_reason_valida" CHECK ("herd"."parentage_record"."sire_reason" is null or "herd"."parentage_record"."sire_reason" in ('parto_visto', 'dicho_de_trabajador', 'unico_toro', 'otro')),
	CONSTRAINT "parentage_birth_date_pair" CHECK (("herd"."parentage_record"."birth_date" is null) = ("herd"."parentage_record"."birth_date_precision" is null)),
	CONSTRAINT "parentage_birth_precision" CHECK ("herd"."parentage_record"."birth_date_precision" is null or "herd"."parentage_record"."birth_date_precision" in ('exact', 'approximate')),
	CONSTRAINT "parentage_version_positiva" CHECK ("herd"."parentage_record"."version" >= 1),
	CONSTRAINT "parentage_note_presente" CHECK ("herd"."parentage_record"."note" is null or length(btrim("herd"."parentage_record"."note")) > 0),
	CONSTRAINT "parentage_not_self_dam" CHECK ("herd"."parentage_record"."dam_id" is null or "herd"."parentage_record"."dam_id" <> "herd"."parentage_record"."offspring_id"),
	CONSTRAINT "parentage_not_self_sire" CHECK ("herd"."parentage_record"."sire_id" is null or "herd"."parentage_record"."sire_id" <> "herd"."parentage_record"."offspring_id"),
	CONSTRAINT "parentage_parents_differ" CHECK ("herd"."parentage_record"."dam_id" is null or "herd"."parentage_record"."sire_id" is null or "herd"."parentage_record"."dam_id" <> "herd"."parentage_record"."sire_id")
);
--> statement-breakpoint
ALTER TABLE "herd"."parentage_correction" ADD CONSTRAINT "parentage_correction_parentage_id_parentage_record_id_fk" FOREIGN KEY ("parentage_id") REFERENCES "herd"."parentage_record"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herd"."parentage_correction" ADD CONSTRAINT "parentage_correction_offspring_id_animal_id_fk" FOREIGN KEY ("offspring_id") REFERENCES "herd"."animal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herd"."parentage_record" ADD CONSTRAINT "parentage_record_offspring_id_animal_id_fk" FOREIGN KEY ("offspring_id") REFERENCES "herd"."animal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herd"."parentage_record" ADD CONSTRAINT "parentage_record_dam_id_animal_id_fk" FOREIGN KEY ("dam_id") REFERENCES "herd"."animal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herd"."parentage_record" ADD CONSTRAINT "parentage_record_sire_id_animal_id_fk" FOREIGN KEY ("sire_id") REFERENCES "herd"."animal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parentage_correction_record" ON "herd"."parentage_correction" USING btree ("parentage_id","corrected_at");--> statement-breakpoint
CREATE UNIQUE INDEX "parentage_offspring" ON "herd"."parentage_record" USING btree ("offspring_id");--> statement-breakpoint
CREATE INDEX "parentage_ranch_dam" ON "herd"."parentage_record" USING btree ("ranch_id","dam_id");--> statement-breakpoint
CREATE INDEX "parentage_ranch_sire" ON "herd"."parentage_record" USING btree ("ranch_id","sire_id");