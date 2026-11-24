-- Los intentos fallidos son filas técnicas de la última media hora, no hechos
-- del rancho: se vacían antes de pedirles la IP, en vez de inventarles una.
DELETE FROM "identity"."login_attempt";--> statement-breakpoint
DROP INDEX "identity"."login_attempt_usuario_ocurrido";--> statement-breakpoint
ALTER TABLE "identity"."login_attempt" ADD COLUMN "direccion" text NOT NULL;--> statement-breakpoint
CREATE INDEX "login_attempt_usuario_direccion_ocurrido" ON "identity"."login_attempt" USING btree ("usuario","direccion","occurred_at");--> statement-breakpoint
CREATE INDEX "login_attempt_direccion_ocurrido" ON "identity"."login_attempt" USING btree ("direccion","occurred_at");
