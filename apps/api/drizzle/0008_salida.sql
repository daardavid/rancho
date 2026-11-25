CREATE TABLE "herd"."animal_exit_correction" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"animal_id" uuid NOT NULL,
	"previous_reason" text NOT NULL,
	"previous_known_on" date NOT NULL,
	"previous_note" text,
	"previous_evidence_id" uuid,
	"reason" text NOT NULL,
	"corrected_by" text NOT NULL,
	"corrected_at" timestamp with time zone NOT NULL,
	CONSTRAINT "animal_exit_correction_motivo_anterior" CHECK ("herd"."animal_exit_correction"."previous_reason" in ('sale', 'death', 'confirmed_missing', 'other', 'unknown')),
	CONSTRAINT "animal_exit_correction_motivo" CHECK (length(btrim("herd"."animal_exit_correction"."reason")) > 0),
	CONSTRAINT "animal_exit_correction_nota" CHECK ("herd"."animal_exit_correction"."previous_note" is null or length(btrim("herd"."animal_exit_correction"."previous_note")) > 0)
);
--> statement-breakpoint
ALTER TABLE "herd"."animal" ADD COLUMN "exit_reason" text;--> statement-breakpoint
ALTER TABLE "herd"."animal" ADD COLUMN "exit_known_on" date;--> statement-breakpoint
ALTER TABLE "herd"."animal" ADD COLUMN "exit_note" text;--> statement-breakpoint
ALTER TABLE "herd"."animal" ADD COLUMN "exit_evidence_id" uuid;--> statement-breakpoint
ALTER TABLE "herd"."animal_exit_correction" ADD CONSTRAINT "animal_exit_correction_animal_id_animal_id_fk" FOREIGN KEY ("animal_id") REFERENCES "herd"."animal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "animal_exit_correction_animal" ON "herd"."animal_exit_correction" USING btree ("animal_id","corrected_at");--> statement-breakpoint
ALTER TABLE "herd"."animal" ADD CONSTRAINT "animal_motivo_salida" CHECK ("herd"."animal"."exit_reason" is null or "herd"."animal"."exit_reason" in ('sale', 'death', 'confirmed_missing', 'other', 'unknown'));--> statement-breakpoint
ALTER TABLE "herd"."animal" ADD CONSTRAINT "animal_nota_salida_presente" CHECK ("herd"."animal"."exit_note" is null or length(btrim("herd"."animal"."exit_note")) > 0);--> statement-breakpoint
ALTER TABLE "herd"."animal" ADD CONSTRAINT "animal_salida_coherente" CHECK ((
        "herd"."animal"."active" = true
        and "herd"."animal"."exit_reason" is null
        and "herd"."animal"."exit_known_on" is null
        and "herd"."animal"."exit_note" is null
        and "herd"."animal"."exit_evidence_id" is null
      ) or (
        "herd"."animal"."active" = false
        and "herd"."animal"."exit_reason" is not null
        and "herd"."animal"."exit_known_on" is not null
      ));