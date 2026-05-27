import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspace";
import { usersTable } from "./user";

export const auditLogsTable = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 100 }).notNull(), // form_create, form_publish, form_delete
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("audit_logs_workspace_id_idx").on(table.workspaceId),
]));

export type SelectAuditLog = typeof auditLogsTable.$inferSelect;
export type InsertAuditLog = typeof auditLogsTable.$inferInsert;
