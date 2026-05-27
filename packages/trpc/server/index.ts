import { publicProcedure, router } from "./trpc";
import { z } from "zod";
import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { formsRouter } from "./routes/forms/route";
import { responsesRouter } from "./routes/responses/route";
import { apiKeysRouter } from "./routes/apikeys/route";
import { emailsRouter } from "./routes/emails/route";
import { webhooksRouter } from "./routes/webhooks/route";
import { workspacesRouter } from "./routes/workspaces/route";
import { auditRouter } from "./routes/audit/route";
import { marketplaceRouter } from "./routes/marketplace/route";
import { billingRouter } from "./routes/billing/route";
import { uploadsRouter } from "./routes/uploads/route";
import { adminRouter } from "./routes/admin/route";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  forms: formsRouter,
  responses: responsesRouter,
  apikeys: apiKeysRouter,
  emails: emailsRouter,
  webhooks: webhooksRouter,
  workspaces: workspacesRouter,
  audit: auditRouter,
  marketplace: marketplaceRouter,
  billing: billingRouter,
  uploads: uploadsRouter,
  admin: adminRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;

