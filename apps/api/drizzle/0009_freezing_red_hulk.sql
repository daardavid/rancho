CREATE TABLE "herd"."location_assignment" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"animal_id" uuid NOT NULL,
	"paddock_id" uuid,
	"valid_from" date NOT NULL,
	"note" text,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "location_assignment_nota_presente" CHECK ("herd"."location_assignment"."note" is null or length(btrim("herd"."location_assignment"."note")) > 0)
);
--> statement-breakpoint
CREATE TABLE "herd"."paddock_correction" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"paddock_id" uuid NOT NULL,
	"field" text NOT NULL,
	"previous_value" text,
	"reason" text NOT NULL,
	"corrected_by" text NOT NULL,
	"corrected_at" timestamp with time zone NOT NULL,
	CONSTRAINT "paddock_correction_campo_valido" CHECK ("herd"."paddock_correction"."field" in ('nombre', 'nota')),
	CONSTRAINT "paddock_correction_motivo_presente" CHECK (length(btrim("herd"."paddock_correction"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "herd"."paddock" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"name" text,
	"note" text,
	"version" integer NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "paddock_version_positiva" CHECK ("herd"."paddock"."version" >= 1),
	CONSTRAINT "paddock_nombre_presente" CHECK ("herd"."paddock"."name" is null or length(btrim("herd"."paddock"."name")) > 0),
	CONSTRAINT "paddock_nota_presente" CHECK ("herd"."paddock"."note" is null or length(btrim("herd"."paddock"."note")) > 0)
);
--> statement-breakpoint
ALTER TABLE "herd"."location_assignment" ADD CONSTRAINT "location_assignment_animal_id_animal_id_fk" FOREIGN KEY ("animal_id") REFERENCES "herd"."animal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herd"."location_assignment" ADD CONSTRAINT "location_assignment_paddock_id_paddock_id_fk" FOREIGN KEY ("paddock_id") REFERENCES "herd"."paddock"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herd"."paddock_correction" ADD CONSTRAINT "paddock_correction_paddock_id_paddock_id_fk" FOREIGN KEY ("paddock_id") REFERENCES "herd"."paddock"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "location_assignment_animal" ON "herd"."location_assignment" USING btree ("animal_id","valid_from");--> statement-breakpoint
CREATE INDEX "location_assignment_ranch_potrero" ON "herd"."location_assignment" USING btree ("ranch_id","paddock_id");--> statement-breakpoint
CREATE INDEX "paddock_correction_potrero" ON "herd"."paddock_correction" USING btree ("paddock_id","corrected_at");--> statement-breakpoint
CREATE INDEX "paddock_ranch" ON "herd"."paddock" USING btree ("ranch_id");