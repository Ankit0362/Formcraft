import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { formsTable } from "./form";

export const emailsTable = pgTable("emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id").references(() => formsTable.id, { onDelete: "cascade" }).notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
}, (table) => ([
  index("emails_form_id_idx").on(table.formId),
]));

export type SelectEmail = typeof emailsTable.$inferSelect;
export type InsertEmail = typeof emailsTable.$inferInsert;
