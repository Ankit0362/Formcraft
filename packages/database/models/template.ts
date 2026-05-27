import { pgTable, uuid, varchar, text, boolean, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { usersTable } from "./user";

export const templatesTable = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id").references(() => usersTable.id, { onDelete: "set null" }), // Can be null if curated/system template
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  industry: varchar("industry", { length: 100 }).default("general").notNull(),
  price: integer("price").default(0).notNull(), // Price in cents
  coverImageUrl: text("cover_image_url"),
  layoutType: varchar("layout_type", { length: 20 }).default("conversational").notNull(),
  theme: varchar("theme", { length: 50 }).default("default").notNull(),
  customThemeConfig: jsonb("custom_theme_config"), // e.g. { primaryColor: "#fff", font: "Inter" }
  downloadsCount: integer("downloads_count").default(0).notNull(),
  isCurated: boolean("is_curated").default(false).notNull(), // Platform official template
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ([
  index("templates_industry_idx").on(table.industry),
]));

export const templateFieldsTable = pgTable("template_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id").references(() => templatesTable.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  label: text("label").notNull(),
  placeholder: text("placeholder"),
  required: boolean("required").default(false).notNull(),
  order: integer("order").notNull(),
  options: jsonb("options"),
  validationRules: jsonb("validation_rules"),
  conditionalLogic: jsonb("conditional_logic"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ([
  index("template_fields_template_id_idx").on(table.templateId),
]));

export type SelectTemplate = typeof templatesTable.$inferSelect;
export type InsertTemplate = typeof templatesTable.$inferInsert;

export type SelectTemplateField = typeof templateFieldsTable.$inferSelect;
export type InsertTemplateField = typeof templateFieldsTable.$inferInsert;
