import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * The first clinic release keeps the complete, auditable record in one
 * versioned JSON document. This makes the domain easy to evolve while the
 * paper workflow is being digitized; the API remains the stable boundary.
 */
export const clinicStateTable = pgTable("clinic_state", {
  id: text("id").primaryKey(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});