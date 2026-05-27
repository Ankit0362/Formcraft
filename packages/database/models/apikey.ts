import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspace";

export const apiKeysTable = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }).notNull(),
  key: varchar("key", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  // FIX #15: Store a non-secret hint (last 4 chars of raw key) for display purposes,
  // so users can distinguish between multiple keys without exposing the full key.
  keyHint: varchar("key_hint", { length: 10 }),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
  index("api_keys_workspace_id_idx").on(table.workspaceId),
]));

export type SelectApiKey = typeof apiKeysTable.$inferSelect;
export type InsertApiKey = typeof apiKeysTable.$inferInsert;
