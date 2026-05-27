import { pgTable, uuid, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { formsTable } from "./form";

export const formResponsesTable = pgTable("form_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id").references(() => formsTable.id, { onDelete: "cascade" }).notNull(),
  answers: jsonb("answers").notNull(), // JSON mapping fieldId -> answerValue
  completed: boolean("completed").default(true).notNull(),
  lastActiveFieldId: uuid("last_active_field_id"), // tracks where user abandoned the form (funnel drop-off)
  metadata: jsonb("metadata"), // stores IP (hashed), browser agent, location, responseTime
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("form_responses_form_id_idx").on(table.formId),
]));

export type SelectFormResponse = typeof formResponsesTable.$inferSelect;
export type InsertFormResponse = typeof formResponsesTable.$inferInsert;
