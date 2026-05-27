import { initTRPC, TRPCError } from "@trpc/server";
import { OpenApiMeta } from "trpc-to-openapi";
import { createContext } from "./context";

export const tRPCContext = initTRPC
  .meta<OpenApiMeta>()
  .context<typeof createContext>()
  .create({});

export const router = tRPCContext.router;
export const publicProcedure = tRPCContext.procedure;

// Middleware to enforce user authentication
const isAuthed = tRPCContext.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be authenticated to perform this action",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = publicProcedure.use(isAuthed);

// Middleware to enforce active workspace context
const hasWorkspace = tRPCContext.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be authenticated to perform this action",
    });
  }
  if (!ctx.activeWorkspace) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must select or create a workspace to proceed",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      activeWorkspace: ctx.activeWorkspace,
    },
  });
});

export const workspaceProcedure = protectedProcedure.use(hasWorkspace);

// Utility for tier-based feature gating
export function requireTier(currentTier: string, allowedTiers: string[]) {
  if (!allowedTiers.includes(currentTier)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `This feature requires a ${allowedTiers.join(" or ")} plan. Please upgrade your workspace subscription.`,
    });
  }
}

// Middleware to enforce API Key authentication
const isApiKeyAuthed = tRPCContext.middleware(({ ctx, next }) => {
  if (!ctx.isApiKey || !ctx.activeWorkspace) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Valid API key is required to perform this action",
    });
  }
  return next({
    ctx: {
      ...ctx,
      activeWorkspace: ctx.activeWorkspace,
    },
  });
});

export const apiKeyProcedure = publicProcedure.use(isApiKeyAuthed);
