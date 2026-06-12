import * as trpcExpress from "@trpc/server/adapters/express";
import { db, eq, and } from "@repo/database";
import * as schema from "@repo/database/schema";
import { decryptSession } from "./utils/session";
import crypto from "node:crypto";
import { logger } from "@repo/logger";

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts[0]?.trim();
    const value = parts.slice(1).join("=").trim();
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
}

export async function createContext({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) {
  let user: { id: string; email: string; fullName: string } | null = null;
  let activeWorkspace: { id: string; name: string; slug: string; tier: string; removeBranding: boolean; customDomain: string | null } | null = null;
  let workspaces: Array<{ id: string; name: string; slug: string; tier: string; removeBranding: boolean; customDomain: string | null }> = [];
  let isApiKey = false;

  try {
    const cookies = parseCookies(req.headers.cookie);
    const authHeader = req.headers.authorization;
    let apiKeyHeader = req.headers["x-api-key"] as string | undefined;

    // Support Bearer token for API Keys
    if (!apiKeyHeader && authHeader?.startsWith("Bearer fc_live_")) {
      apiKeyHeader = authHeader.substring(7);
    }

    // 1. Check API Key authentication first
    if (apiKeyHeader) {
      const hashedKey = crypto.createHash("sha256").update(apiKeyHeader).digest("hex");
      const keys = await db
        .select()
        .from(schema.apiKeysTable)
        .where(eq(schema.apiKeysTable.key, hashedKey))
        .limit(1);

      if (keys.length > 0) {
        const apiKey = keys[0]!;
        const workspacesDb = await db
          .select()
          .from(schema.workspacesTable)
          .where(eq(schema.workspacesTable.id, apiKey.workspaceId))
          .limit(1);

        const ws = workspacesDb[0];
        if (ws) {
          activeWorkspace = {
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            tier: ws.tier,
            removeBranding: ws.removeBranding,
            customDomain: ws.customDomain,
          };
          // Find the workspace owner for API key context (instead of phantom user)
          const ownerMemberships = await db
            .select({ userId: schema.workspaceMembersTable.userId })
            .from(schema.workspaceMembersTable)
            .where(
              and(
                eq(schema.workspaceMembersTable.workspaceId, ws.id),
                eq(schema.workspaceMembersTable.role, "owner")
              )
            )
            .limit(1);

          if (ownerMemberships.length > 0) {
            const ownerId = ownerMemberships[0]!.userId;
            const owners = await db
              .select({
                id: schema.usersTable.id,
                email: schema.usersTable.email,
                fullName: schema.usersTable.fullName,
              })
              .from(schema.usersTable)
              .where(eq(schema.usersTable.id, ownerId))
              .limit(1);
            if (owners.length > 0) {
              const owner = owners[0]!;
              user = {
                id: owner.id,
                email: owner.email,
                fullName: owner.fullName,
              };
              isApiKey = true;
            }
          }
          workspaces = [activeWorkspace];
        }
      }
    }

    // 2. Fallback to Session Cookie or Bearer Token auth if API Key not found
    if (!user) {
      let sessionToken: string | undefined = cookies["fc_session"];
      if (!sessionToken && authHeader?.startsWith("Bearer ")) {
        sessionToken = authHeader.substring(7);
      }

      if (sessionToken) {
        const userId = decryptSession(sessionToken);
        if (userId) {
          // Query user details
          const users = await db
            .select({
              id: schema.usersTable.id,
              email: schema.usersTable.email,
              fullName: schema.usersTable.fullName,
            })
            .from(schema.usersTable)
            .where(eq(schema.usersTable.id, userId))
            .limit(1);

          if (users.length > 0) {
            const dbUser = users[0]!;
            user = {
              id: dbUser.id,
              email: dbUser.email,
              fullName: dbUser.fullName,
            };

            // Query workspaces where the user is a member
            const memberships = await db
              .select({
                workspace: schema.workspacesTable,
              })
              .from(schema.workspaceMembersTable)
              .innerJoin(
                schema.workspacesTable,
                eq(schema.workspacesTable.id, schema.workspaceMembersTable.workspaceId)
              )
              .where(eq(schema.workspaceMembersTable.userId, dbUser.id));

            workspaces = memberships.map((m) => ({
              id: m.workspace.id,
              name: m.workspace.name,
              slug: m.workspace.slug,
              tier: m.workspace.tier,
              removeBranding: m.workspace.removeBranding,
              customDomain: m.workspace.customDomain,
            }));

            if (workspaces.length > 0) {
              const workspaceIdHeader = req.headers["x-workspace-id"];
              const matched = workspaces.find((w) => w.id === workspaceIdHeader);
              activeWorkspace = matched || workspaces[0] || null;
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error("Context creation error:", { error });
    // Don't swallow critical DB errors
    if (error instanceof Error && error.message.includes("database")) {
      throw error;
    }
  }

  return {
    req,
    res,
    user,
    activeWorkspace,
    workspaces,
    isApiKey,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
