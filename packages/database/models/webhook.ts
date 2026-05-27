import { pgTable, uuid, boolean, text, varchar, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspace";

export const webhooksTable = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  secret: varchar("secret", { length: 64 }), // Used for HMAC signatures
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ([
  index("webhooks_workspace_id_idx").on(table.workspaceId),
]));

export const webhookLogsTable = pgTable("webhook_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  webhookId: uuid("webhook_id").references(() => webhooksTable.id, { onDelete: "cascade" }).notNull(),
  event: varchar("event", { length: 50 }).notNull(),
  payload: jsonb("payload").notNull(),
  responseStatus: integer("response_status"),
  deliveredAt: timestamp("delivered_at").defaultNow().notNull(),
}, (table) => ([
  index("webhook_logs_webhook_id_idx").on(table.webhookId),
]));

export type SelectWebhook = typeof webhooksTable.$inferSelect;
export type InsertWebhook = typeof webhooksTable.$inferInsert;

export type SelectWebhookLog = typeof webhookLogsTable.$inferSelect;
export type InsertWebhookLog = typeof webhookLogsTable.$inferInsert;
