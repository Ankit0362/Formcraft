import { db, eq, and } from "@repo/database";
import * as schema from "@repo/database/schema";
import { TRPCError } from "@trpc/server";

type AllowedRole = "owner" | "admin" | "editor" | "analyst" | "viewer" | "member";

export async function requireRole(
  userId: string,
  workspaceId: string,
  allowedRoles: AllowedRole[]
): Promise<string> {
  const members = await db
    .select({ role: schema.workspaceMembersTable.role })
    .from(schema.workspaceMembersTable)
    .where(
      and(
        eq(schema.workspaceMembersTable.userId, userId),
        eq(schema.workspaceMembersTable.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (members.length === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this workspace.",
    });
  }

  const role = members[0]!.role;
  if (!allowedRoles.includes(role as AllowedRole)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `This action requires one of these roles: ${allowedRoles.join(", ")}. Your role: ${role}`,
    });
  }

  return role;
}
