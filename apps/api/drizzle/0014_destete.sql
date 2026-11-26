CREATE TABLE "herd"."weaning_correction" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"weaning_id" uuid NOT NULL,
	"field" text NOT NULL,
	"previous_value" text,
	"reason" text NOT NULL,
	"corrected_by" text NOT NULL,
	"corrected_at" timestamp with time zone NOT NULL,
	CONSTRAINT "weaning_correction_campo_valido" CHECK ("herd"."weaning_correction"."field" in ('fecha', 'precision', 'nota', 'reportedBy')),
	CONSTRAINT "weaning_correction_motivo_presente" CHECK (length(btrim("herd"."weaning_correction"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "herd"."weaning" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"animal_id" uuid NOT NULL,
	"occurred_on" date,
	"date_precision" text,
	"note" text,
	"reported_by" text,
	"weight_id" uuid,
	"version" integer NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "weaning_fecha_par" CHECK (("herd"."weaning"."occurred_on" is null) = ("herd"."weaning"."date_precision" is null)),
	CONSTRAINT "weaning_precision_valida" CHECK ("herd"."weaning"."date_precision" is null or "herd"."weaning"."date_precision" in ('exact', 'approximate')),
	CONSTRAINT "weaning_nota_presente" CHECK ("herd"."weaning"."note" is null or length(btrim("herd"."weaning"."note")) > 0),
	CONSTRAINT "weaning_reported_by_presente" CHECK ("herd"."weaning"."reported_by" is null or length(btrim("herd"."weaning"."reported_by")) > 0),
	CONSTRAINT "weaning_version_positiva" CHECK ("herd"."weaning"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "herd"."weaning_correction" ADD CONSTRAINT "weaning_correction_weaning_id_weaning_id_fk" FOREIGN KEY ("weaning_id") REFERENCES "herd"."weaning"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herd"."weaning" ADD CONSTRAINT "weaning_animal_id_animal_id_fk" FOREIGN KEY ("animal_id") REFERENCES "herd"."animal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "weaning_correction_destete" ON "herd"."weaning_correction" USING btree ("weaning_id","corrected_at");--> statement-breakpoint
CREATE UNIQUE INDEX "weaning_one_per_animal" ON "herd"."weaning" USING btree ("ranch_id","animal_id");--> statement-breakpoint
CREATE INDEX "weaning_ranch" ON "herd"."weaning" USING btree ("ranch_id");