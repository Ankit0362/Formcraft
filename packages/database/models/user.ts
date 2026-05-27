import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  text,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  fullName: varchar("full_name", { length: 80 }).notNull(),

  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }), // custom login/demo credentials
  emailVerified: boolean("email_verified").default(false),

  profileImageUrl: text("profile_image_url"),

  // Super admin can manage all workspaces and grant tier upgrades
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export type SelectUser = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id).notNull(),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectPasswordResetToken = typeof passwordResetTokensTable.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokensTable.$inferInsert;
