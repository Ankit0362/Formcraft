import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().describe("DB URL"),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) {
    console.warn("⚠️ DATABASE_URL is missing. Using dummy URL to allow build to complete.");
    return { DATABASE_URL: "postgresql://dummy:dummy@localhost:5432/dummy" } as any;
  }
  return safeParseResult.data;
}

export const env = createEnv(process.env);
