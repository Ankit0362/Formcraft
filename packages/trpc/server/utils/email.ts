import { Resend } from "resend";
import { db } from "@repo/database";
import * as schema from "@repo/database/schema";

const resend = new Resend(process.env.RESEND_API_KEY || "dummy_key");

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  workspaceId?: string; // For analytics tracking
};

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = "FormCraft <noreply@formcraft.com>",
  workspaceId,
}: SendEmailParams) {
  // If no valid Resend key is provided, just log to DB and console
  if (!process.env.RESEND_API_KEY) {
    console.log(`[SIMULATED EMAIL] To: ${to} | Subject: ${subject}`);
    console.log(html);

    // If we wanted to log system emails, we would need a different table.
    return { id: "simulated_email_id" };
  }

  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });

    // If we wanted to log system emails, we would need a different table.
    // emailsTable is for form response emails (requires formId).
    return data;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}
