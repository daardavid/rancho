CREATE TABLE "herd"."animal_photo" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"animal_id" uuid NOT NULL,
	"evidence_id" uuid NOT NULL,
	"thumbnail_evidence_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "animal_photo_version_positiva" CHECK ("herd"."animal_photo"."version" >= 1),
	CONSTRAINT "animal_photo_quien" CHECK (length(btrim("herd"."animal_photo"."recorded_by")) > 0)
);
--> statement-breakpoint
ALTER TABLE "herd"."animal_photo" ADD CONSTRAINT "animal_photo_animal_id_animal_id_fk" FOREIGN KEY ("animal_id") REFERENCES "herd"."animal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "animal_photo_version" ON "herd"."animal_photo" USING btree ("animal_id","version");--> statement-breakpoint
CREATE INDEX "animal_photo_ranch" ON "herd"."animal_photo" USING btree ("ranch_id","animal_id");