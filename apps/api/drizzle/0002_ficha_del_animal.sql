CREATE TABLE "herd"."animal" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"name" text,
	"sex" text NOT NULL,
	"category" text NOT NULL,
	"category_detail" text,
	"tenure" text NOT NULL,
	"economic_participation" text NOT NULL,
	"arrangement_note" text,
	"note" text,
	"active" boolean NOT NULL,
	"version" integer NOT NULL,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "animal_sexo_valido" CHECK ("herd"."animal"."sex" in ('female', 'male', 'unknown')),
	CONSTRAINT "animal_categoria_valida" CHECK ("herd"."animal"."category" in ('calf', 'cow', 'bull', 'other', 'unknown')),
	CONSTRAINT "animal_tenencia_valida" CHECK ("herd"."animal"."tenure" in ('ranch', 'a_la_parte', 'third_party', 'unknown')),
	CONSTRAINT "animal_participacion_valida" CHECK ("herd"."animal"."economic_participation" in ('known', 'partially_known', 'unknown')),
	CONSTRAINT "animal_detalle_solo_en_other" CHECK ("herd"."animal"."category_detail" is null or "herd"."animal"."category" = 'other'),
	CONSTRAINT "animal_version_positiva" CHECK ("herd"."animal"."version" >= 1),
	CONSTRAINT "animal_nombre_presente" CHECK ("herd"."animal"."name" is null or length(btrim("herd"."animal"."name")) > 0),
	CONSTRAINT "animal_nota_arreglo_presente" CHECK ("herd"."animal"."arrangement_note" is null or length(btrim("herd"."animal"."arrangement_note")) > 0),
	CONSTRAINT "animal_nota_presente" CHECK ("herd"."animal"."note" is null or length(btrim("herd"."animal"."note")) > 0)
);
--> statement-breakpoint
CREATE TABLE "herd"."animal_correction" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"animal_id" uuid NOT NULL,
	"field" text NOT NULL,
	"previous_value" text,
	"reason" text NOT NULL,
	"corrected_by" text NOT NULL,
	"corrected_at" timestamp with time zone NOT NULL,
	CONSTRAINT "animal_correction_campo_valido" CHECK ("herd"."animal_correction"."field" in ('nombre', 'sexo', 'categoria', 'detalleCategoria', 'tenencia', 'participacionEconomica', 'notaDelArreglo', 'nota')),
	CONSTRAINT "animal_correction_motivo_presente" CHECK (length(btrim("herd"."animal_correction"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "herd"."animal_mark" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"animal_id" uuid NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"valid_from" date,
	"status" text NOT NULL,
	"changed_on" date,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "animal_mark_tipo_valido" CHECK ("herd"."animal_mark"."type" in ('siniiga', 'other')),
	CONSTRAINT "animal_mark_estado_valido" CHECK ("herd"."animal_mark"."status" in ('active', 'replaced', 'lost')),
	CONSTRAINT "animal_mark_valor_presente" CHECK (length(btrim("herd"."animal_mark"."value")) > 0),
	CONSTRAINT "animal_mark_vigente_sin_cierre" CHECK ("herd"."animal_mark"."status" <> 'active' or "herd"."animal_mark"."changed_on" is null)
);
--> statement-breakpoint
ALTER TABLE "herd"."animal_correction" ADD CONSTRAINT "animal_correction_animal_id_animal_id_fk" FOREIGN KEY ("animal_id") REFERENCES "herd"."animal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herd"."animal_mark" ADD CONSTRAINT "animal_mark_animal_id_animal_id_fk" FOREIGN KEY ("animal_id") REFERENCES "herd"."animal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "animal_ranch_activo" ON "herd"."animal" USING btree ("ranch_id","active");--> statement-breakpoint
CREATE INDEX "animal_correction_animal" ON "herd"."animal_correction" USING btree ("animal_id","corrected_at");--> statement-breakpoint
CREATE INDEX "animal_mark_ranch_valor" ON "herd"."animal_mark" USING btree ("ranch_id","value");--> statement-breakpoint
CREATE INDEX "animal_mark_animal" ON "herd"."animal_mark" USING btree ("animal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "animal_mark_siniiga_activa" ON "herd"."animal_mark" USING btree ("ranch_id","value") WHERE "herd"."animal_mark"."type" = 'siniiga' and "herd"."animal_mark"."status" = 'active';