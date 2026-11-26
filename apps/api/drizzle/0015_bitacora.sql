CREATE SCHEMA "journal";
--> statement-breakpoint
CREATE TABLE "journal"."reminder_animal" (
	"reminder_id" uuid NOT NULL,
	"animal_id" uuid NOT NULL,
	"ranch_id" uuid NOT NULL,
	CONSTRAINT "reminder_animal_reminder_id_animal_id_pk" PRIMARY KEY("reminder_id","animal_id")
);
--> statement-breakpoint
CREATE TABLE "journal"."reminder_status_change" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"reminder_id" uuid NOT NULL,
	"previous_status" text NOT NULL,
	"new_status" text NOT NULL,
	"changed_by" text NOT NULL,
	"changed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "reminder_status_change_anterior" CHECK ("journal"."reminder_status_change"."previous_status" in ('pendiente', 'hecho', 'ya_no_aplica')),
	CONSTRAINT "reminder_status_change_nuevo" CHECK ("journal"."reminder_status_change"."new_status" in ('pendiente', 'hecho', 'ya_no_aplica'))
);
--> statement-breakpoint
CREATE TABLE "journal"."note_correction" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"field" text NOT NULL,
	"previous_value" text,
	"reason" text NOT NULL,
	"corrected_by" text NOT NULL,
	"corrected_at" timestamp with time zone NOT NULL,
	CONSTRAINT "note_correction_campo_valido" CHECK ("journal"."note_correction"."field" in ('tipo', 'texto', 'fecha', 'precision', 'potrero', 'reportedBy', 'evidencia')),
	CONSTRAINT "note_correction_motivo_presente" CHECK (length(btrim("journal"."note_correction"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "journal"."reminder_correction" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"reminder_id" uuid NOT NULL,
	"field" text NOT NULL,
	"previous_value" text,
	"reason" text NOT NULL,
	"corrected_by" text NOT NULL,
	"corrected_at" timestamp with time zone NOT NULL,
	CONSTRAINT "reminder_correction_campo_valido" CHECK ("journal"."reminder_correction"."field" in ('texto', 'fecha', 'sujeto')),
	CONSTRAINT "reminder_correction_motivo_presente" CHECK (length(btrim("journal"."reminder_correction"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "journal"."note" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"type" text NOT NULL,
	"body" text NOT NULL,
	"occurred_on" date NOT NULL,
	"date_precision" text NOT NULL,
	"paddock_id" uuid,
	"reported_by" text,
	"evidence_id" uuid,
	"version" integer NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "note_tipo_valido" CHECK ("journal"."note"."type" in ('lluvia', 'quema', 'agua', 'cerca', 'otro')),
	CONSTRAINT "note_precision_valida" CHECK ("journal"."note"."date_precision" in ('exact', 'approximate')),
	CONSTRAINT "note_texto_presente" CHECK (length(btrim("journal"."note"."body")) > 0),
	CONSTRAINT "note_reported_by_presente" CHECK ("journal"."note"."reported_by" is null or length(btrim("journal"."note"."reported_by")) > 0),
	CONSTRAINT "note_version_positiva" CHECK ("journal"."note"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "journal"."reminder" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"body" text NOT NULL,
	"due_on" date NOT NULL,
	"status" text NOT NULL,
	"subject_kind" text,
	"paddock_id" uuid,
	"status_changed_by" text NOT NULL,
	"status_changed_at" timestamp with time zone NOT NULL,
	"version" integer NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "reminder_estado_valido" CHECK ("journal"."reminder"."status" in ('pendiente', 'hecho', 'ya_no_aplica')),
	CONSTRAINT "reminder_texto_presente" CHECK (length(btrim("journal"."reminder"."body")) > 0),
	CONSTRAINT "reminder_sujeto_valido" CHECK ("journal"."reminder"."subject_kind" is null or "journal"."reminder"."subject_kind" in ('animal', 'grupo', 'potrero')),
	CONSTRAINT "reminder_sujeto_coherente" CHECK ((
        ("journal"."reminder"."subject_kind" is null and "journal"."reminder"."paddock_id" is null)
        or ("journal"."reminder"."subject_kind" = 'potrero' and "journal"."reminder"."paddock_id" is not null)
        or ("journal"."reminder"."subject_kind" in ('animal', 'grupo') and "journal"."reminder"."paddock_id" is null)
      )),
	CONSTRAINT "reminder_version_positiva" CHECK ("journal"."reminder"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "journal"."reminder_animal" ADD CONSTRAINT "reminder_animal_reminder_id_reminder_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "journal"."reminder"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal"."reminder_status_change" ADD CONSTRAINT "reminder_status_change_reminder_id_reminder_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "journal"."reminder"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal"."note_correction" ADD CONSTRAINT "note_correction_note_id_note_id_fk" FOREIGN KEY ("note_id") REFERENCES "journal"."note"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal"."reminder_correction" ADD CONSTRAINT "reminder_correction_reminder_id_reminder_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "journal"."reminder"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reminder_animal_ranch" ON "journal"."reminder_animal" USING btree ("ranch_id","animal_id");--> statement-breakpoint
CREATE INDEX "reminder_status_change_pendiente" ON "journal"."reminder_status_change" USING btree ("reminder_id","changed_at");--> statement-breakpoint
CREATE INDEX "note_correction_nota" ON "journal"."note_correction" USING btree ("note_id","corrected_at");--> statement-breakpoint
CREATE INDEX "reminder_correction_pendiente" ON "journal"."reminder_correction" USING btree ("reminder_id","corrected_at");--> statement-breakpoint
CREATE INDEX "note_ranch_fecha" ON "journal"."note" USING btree ("ranch_id","occurred_on");--> statement-breakpoint
CREATE INDEX "reminder_ranch_estado_fecha" ON "journal"."reminder" USING btree ("ranch_id","status","due_on");