CREATE SCHEMA "evidence";
--> statement-breakpoint
CREATE TABLE "evidence"."file" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"original_filename" text,
	CONSTRAINT "evidence_file_clave_forma" CHECK ("evidence"."file"."storage_key" = ("evidence"."file"."ranch_id")::text || '/' || ("evidence"."file"."id")::text),
	CONSTRAINT "evidence_file_tipo_imagen" CHECK ("evidence"."file"."content_type" in ('image/jpeg', 'image/png', 'image/webp')),
	CONSTRAINT "evidence_file_tamano" CHECK ("evidence"."file"."byte_size" > 0 and "evidence"."file"."byte_size" <= 26214400),
	CONSTRAINT "evidence_file_sha" CHECK ("evidence"."file"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "evidence_file_nombre" CHECK ("evidence"."file"."original_filename" is null or length(btrim("evidence"."file"."original_filename")) > 0)
);
--> statement-breakpoint
ALTER TABLE "growth"."weight_correction" DROP CONSTRAINT "weight_correction_campo_valido";--> statement-breakpoint
ALTER TABLE "growth"."weighing_line" DROP CONSTRAINT "weighing_line_forma_valida";--> statement-breakpoint
ALTER TABLE "growth"."weighing_line" ADD COLUMN "evidence_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_file_clave" ON "evidence"."file" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "evidence_file_ranch" ON "evidence"."file" USING btree ("ranch_id","id");--> statement-breakpoint
ALTER TABLE "growth"."weight_correction" ADD CONSTRAINT "weight_correction_campo_valido" CHECK ("growth"."weight_correction"."field" in ('kilos', 'calidad', 'evidencia'));--> statement-breakpoint
ALTER TABLE "growth"."weighing_line" ADD CONSTRAINT "weighing_line_forma_valida" CHECK ((
        "growth"."weighing_line"."result" = 'weighed'
        and "growth"."weighing_line"."kilos" is not null
        and "growth"."weighing_line"."quality" in ('measured', 'observed', 'declared')
        and "growth"."weighing_line"."version" >= 1
      ) or (
        "growth"."weighing_line"."result" = 'gap'
        and "growth"."weighing_line"."kilos" is null
        and "growth"."weighing_line"."quality" is null
        and "growth"."weighing_line"."version" is null
        and "growth"."weighing_line"."evidence_id" is null
      ));