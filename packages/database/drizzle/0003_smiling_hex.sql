CREATE TABLE "template_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"label" text NOT NULL,
	"placeholder" text,
	"required" boolean DEFAULT false NOT NULL,
	"order" integer NOT NULL,
	"options" jsonb,
	"validation_rules" jsonb,
	"conditional_logic" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"industry" varchar(100) DEFAULT 'general' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"cover_image_url" text,
	"layout_type" varchar(20) DEFAULT 'conversational' NOT NULL,
	"theme" varchar(50) DEFAULT 'default' NOT NULL,
	"custom_theme_config" jsonb,
	"downloads_count" integer DEFAULT 0 NOT NULL,
	"is_curated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "custom_theme_config" jsonb;--> statement-breakpoint
ALTER TABLE "template_fields" ADD CONSTRAINT "template_fields_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;