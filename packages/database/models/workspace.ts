import { pgTable, uuid, varchar, text, boolean, timestamp, index, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./user";

export const workspacesTable = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  tier: varchar("tier", { length: 20 }).default("free").notNull(), // free, pro, business, enterprise
  logoUrl: text("logo_url"),
  customDomain: varchar("custom_domain", { length: 255 }),
  removeBranding: boolean("remove_branding").default(false).notNull(),
  razorpayCustomerId: varchar("razorpay_customer_id", { length: 255 }),
  razorpaySubscriptionId: varchar("razorpay_subscription_id", { length: 255 }),
  razorpayPlanId: varchar("razorpay_plan_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const workspaceMembersTable = pgTable("workspace_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 20 }).default("member").notNull(), // owner, admin, editor, analyst, viewer
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ([
  index("workspace_members_workspace_id_idx").on(table.workspaceId),
  index("workspace_members_user_id_idx").on(table.userId),
  unique("workspace_members_unique").on(table.workspaceId, table.userId),
]));

export const workspaceInvitationsTable = pgTable("workspace_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).default("member").notNull(),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, accepted, revoked
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()),
}, (table) => ([
  index("workspace_invitations_workspace_id_idx").on(table.workspaceId),
  index("workspace_invitations_email_idx").on(table.email),
  index("workspace_invitations_token_hash_idx").on(table.tokenHash),
]));

export type SelectWorkspace = typeof workspacesTable.$inferSelect;
export type InsertWorkspace = typeof workspacesTable.$inferInsert;

export type SelectWorkspaceMember = typeof workspaceMembersTable.$inferSelect;
export type InsertWorkspaceMember = typeof workspaceMembersTable.$inferInsert;

export type SelectWorkspaceInvitation = typeof workspaceInvitationsTable.$inferSelect;
export type InsertWorkspaceInvitation = typeof workspaceInvitationsTable.$inferInsert;
