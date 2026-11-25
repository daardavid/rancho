CREATE TABLE "herd"."health_event_correction" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"health_event_id" uuid NOT NULL,
	"field" text NOT NULL,
	"previous_value" text,
	"reason" text NOT NULL,
	"corrected_by" text NOT NULL,
	"corrected_at" timestamp with time zone NOT NULL,
	CONSTRAINT "health_event_correction_campo_valido" CHECK ("herd"."health_event_correction"."field" in ('tipo', 'detalle', 'fecha', 'producto', 'evidencia', 'vioAlAnimal')),
	CONSTRAINT "health_event_correction_motivo_presente" CHECK (length(btrim("herd"."health_event_correction"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "herd"."health_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"animal_id" uuid NOT NULL,
	"type" text NOT NULL,
	"detail" text NOT NULL,
	"occurred_on" date NOT NULL,
	"product" text,
	"evidence_id" uuid,
	"saw_animal" boolean NOT NULL,
	"version" integer NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "health_event_tipo_valido" CHECK ("herd"."health_event"."type" in ('vacuna', 'medicamento', 'bano', 'problema', 'otro')),
	CONSTRAINT "health_event_detalle_presente" CHECK (length(btrim("herd"."health_event"."detail")) > 0),
	CONSTRAINT "health_event_producto_presente" CHECK ("herd"."health_event"."product" is null or length(btrim("herd"."health_event"."product")) > 0),
	CONSTRAINT "health_event_version_positiva" CHECK ("herd"."health_event"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "herd"."health_event_correction" ADD CONSTRAINT "health_event_correction_health_event_id_health_event_id_fk" FOREIGN KEY ("health_event_id") REFERENCES "herd"."health_event"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herd"."health_event" ADD CONSTRAINT "health_event_animal_id_animal_id_fk" FOREIGN KEY ("animal_id") REFERENCES "herd"."animal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_event_correction_nota" ON "herd"."health_event_correction" USING btree ("health_event_id","corrected_at");--> statement-breakpoint
CREATE INDEX "health_event_animal" ON "herd"."health_event" USING btree ("animal_id","occurred_on");--> statement-breakpoint
CREATE INDEX "health_event_ranch_fecha" ON "herd"."health_event" USING btree ("ranch_id","occurred_on");