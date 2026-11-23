CREATE TABLE "growth"."weight_correction" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"line_id" uuid NOT NULL,
	"field" text NOT NULL,
	"previous_value" text NOT NULL,
	"reason" text NOT NULL,
	"corrected_by" text NOT NULL,
	"corrected_at" timestamp with time zone NOT NULL,
	CONSTRAINT "weight_correction_campo_valido" CHECK ("growth"."weight_correction"."field" in ('kilos', 'calidad')),
	CONSTRAINT "weight_correction_valor_presente" CHECK (length(btrim("growth"."weight_correction"."previous_value")) > 0),
	CONSTRAINT "weight_correction_motivo_presente" CHECK (length(btrim("growth"."weight_correction"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "growth"."weighing_line" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"animal_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"result" text NOT NULL,
	"kilos" numeric(12, 3),
	"quality" text,
	"version" integer,
	CONSTRAINT "weighing_line_resultado_valido" CHECK ("growth"."weighing_line"."result" in ('weighed', 'gap')),
	CONSTRAINT "weighing_line_posicion_valida" CHECK ("growth"."weighing_line"."position" >= 0),
	CONSTRAINT "weighing_line_forma_valida" CHECK ((
        "growth"."weighing_line"."result" = 'weighed'
        and "growth"."weighing_line"."kilos" is not null
        and "growth"."weighing_line"."quality" in ('measured', 'observed', 'declared')
        and "growth"."weighing_line"."version" >= 1
      ) or (
        "growth"."weighing_line"."result" = 'gap'
        and "growth"."weighing_line"."kilos" is null
        and "growth"."weighing_line"."quality" is null
        and "growth"."weighing_line"."version" is null
      ))
);
--> statement-breakpoint
CREATE TABLE "growth"."weighing_session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ranch_id" uuid NOT NULL,
	"weighed_on" date NOT NULL,
	"note" text,
	"reported_by" text,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"command_id" uuid NOT NULL,
	CONSTRAINT "weighing_session_nota_presente" CHECK ("growth"."weighing_session"."note" is null or length(btrim("growth"."weighing_session"."note")) > 0),
	CONSTRAINT "weighing_session_reported_presente" CHECK ("growth"."weighing_session"."reported_by" is null or length(btrim("growth"."weighing_session"."reported_by")) > 0)
);
--> statement-breakpoint
ALTER TABLE "growth"."weight_correction" ADD CONSTRAINT "weight_correction_line_id_weighing_line_id_fk" FOREIGN KEY ("line_id") REFERENCES "growth"."weighing_line"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "growth"."weighing_line" ADD CONSTRAINT "weighing_line_session_id_weighing_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "growth"."weighing_session"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "weight_correction_line" ON "growth"."weight_correction" USING btree ("line_id","corrected_at");--> statement-breakpoint
CREATE UNIQUE INDEX "weighing_line_session_animal" ON "growth"."weighing_line" USING btree ("session_id","animal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "weighing_line_session_position" ON "growth"."weighing_line" USING btree ("session_id","position");--> statement-breakpoint
CREATE INDEX "weighing_line_animal" ON "growth"."weighing_line" USING btree ("ranch_id","animal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "weighing_session_command" ON "growth"."weighing_session" USING btree ("command_id");--> statement-breakpoint
CREATE INDEX "weighing_session_ranch_fecha" ON "growth"."weighing_session" USING btree ("ranch_id","weighed_on");--> statement-breakpoint
ALTER TABLE "growth"."weighing_line" ADD CONSTRAINT "weighing_line_animal_id_fk" FOREIGN KEY ("animal_id") REFERENCES "herd"."animal"("id") ON DELETE restrict ON UPDATE no action;