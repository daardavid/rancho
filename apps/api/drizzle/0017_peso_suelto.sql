ALTER TABLE "growth"."weighing_session" ADD COLUMN "kind" text DEFAULT 'vuelta' NOT NULL;--> statement-breakpoint
ALTER TABLE "growth"."weighing_session" ADD CONSTRAINT "weighing_session_clase_valida" CHECK ("growth"."weighing_session"."kind" in ('vuelta', 'suelto'));--> statement-breakpoint
-- Las sesiones que ya nacieron de un destete con peso quedan como peso suelto.
-- Lee herd.weaning solo en esta migración de datos: Growth no escribe en Herd.
UPDATE "growth"."weighing_session" AS sesion
SET "kind" = 'suelto'
WHERE sesion.id IN (
  SELECT linea.session_id
  FROM "herd"."weaning" destete
  JOIN "growth"."weighing_line" linea
    ON linea.id = destete.weight_id
   AND linea.ranch_id = destete.ranch_id
  WHERE destete.weight_id IS NOT NULL
);
