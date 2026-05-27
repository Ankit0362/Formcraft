import { z, zodUndefinedModel } from "../../schema";
import { publicProcedure, router } from "../../trpc";

import { db, sql } from "@repo/database";

export const healthRouter = router({
  check: publicProcedure
    .meta({ openapi: { method: "GET", path: "/health", tags: ["Health"] } })
    .input(zodUndefinedModel)
    .output(z.object({ status: z.string(), memory: z.any() }))
    .query(async () => {
      await db.execute(sql`SELECT 1`);
      return { 
        status: "ok",
        memory: process.memoryUsage()
      };
    }),
});
