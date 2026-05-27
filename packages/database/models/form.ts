import { pgTable, uuid, varchar, text, boolean, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspace";

export const formsTable = pgTable("forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").references(() => workspacesTable.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("draft").notNull(), // draft, published, unpublished
  visibility: varchar("visibility", { length: 20 }).default("public").notNull(), // public, unlisted
  layoutType: varchar("layout_type", { length: 20 }).default("conversational").notNull(), // conversational, classic
  theme: varchar("theme", { length: 50 }).default("default").notNull(), // default, cyberpunk, retro, glassmorphism, startup, neon
  customThemeConfig: jsonb("custom_theme_config"), // dynamic JSON config for marketplace themes
  customSlug: varchar("custom_slug", { length: 100 }).unique(),
  password: varchar("password", { length: 255 }), // password-protection hash or plain
  expiryDate: timestamp("expiry_date"),
  responseLimit: integer("response_limit"),
  viewsCount: integer("views_count").default(0).notNull(),
  startsCount: integer("starts_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ([
  index("forms_workspace_id_idx").on(table.workspaceId),
]));

export const formFieldsTable = pgTable("form_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id").references(() => formsTable.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // short_text, long_text, email, number, select, multi_select, checkbox, rating, date
  label: text("label").notNull(),
  placeholder: text("placeholder"),
  required: boolean("required").default(false).notNull(),
  order: integer("order").notNull(),
  options: jsonb("options"), // array of strings for choice list: ["Apples", "Bananas"]
  validationRules: jsonb("validation_rules"), // validation parameters: { min: 1, max: 10, regex: "^[a-z]+$" }
  conditionalLogic: jsonb("conditional_logic"), // branching array: [{ dependOnFieldId: string, operator: string, value: string, action: string }]
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ([
  index("form_fields_form_id_idx").on(table.formId),
]));

export type SelectForm = typeof formsTable.$inferSelect;
export type InsertForm = typeof formsTable.$inferInsert;

export type SelectFormField = typeof formFieldsTable.$inferSelect;
export type InsertFormField = typeof formFieldsTable.$inferInsert;
