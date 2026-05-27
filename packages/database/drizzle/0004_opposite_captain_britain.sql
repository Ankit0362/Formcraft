ALTER TABLE "workspace_members" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "last_used_at" timestamp;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "secret" varchar(64);--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
CREATE INDEX "workspace_members_workspace_id_idx" ON "workspace_members" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "form_fields_form_id_idx" ON "form_fields" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "forms_workspace_id_idx" ON "forms" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "form_responses_form_id_idx" ON "form_responses" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "api_keys_workspace_id_idx" ON "api_keys" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "emails_form_id_idx" ON "emails" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "webhook_logs_webhook_id_idx" ON "webhook_logs" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "webhooks_workspace_id_idx" ON "webhooks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_id_idx" ON "audit_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "template_fields_template_id_idx" ON "template_fields" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "templates_industry_idx" ON "templates" USING btree ("industry");--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_unique" UNIQUE("workspace_id","user_id");