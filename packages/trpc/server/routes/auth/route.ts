import crypto from "node:crypto";
import { z, zodUndefinedModel } from "../../schema";
import { publicProcedure, protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";
import { db, eq } from "@repo/database";
import * as schema from "@repo/database/schema";
import { encryptSession } from "../../utils/session";
import { hashPassword, verifyPassword } from "../../utils/password";
import { sendEmail } from "../../utils/email";
import { TRPCError } from "@trpc/server";

const TAGS = ["Authentication"];
const getPath = generatePath("/authentication");

// hashPassword and verifyPassword are imported from ../../utils/password

const setSessionCookie = (res: any, userId: string): string => {
  const token = encryptSession(userId);
  if (res) {
    res.setHeader(
      "Set-Cookie",
      `fc_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${60 * 60 * 24 * 7}`
    );
  }
  return token;
};

const clearSessionCookie = (res: any) => {
  if (!res) return;
  res.setHeader(
    "Set-Cookie",
    "fc_session=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  );
};

export const authRouter = router({
  signup: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/signup"), tags: TAGS } })
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
        fullName: z.string().min(2),
      })
    )
    .output(
      z.object({
        user: z.object({
          id: z.string(),
          email: z.string(),
          fullName: z.string(),
        }),
        workspace: z.object({
          id: z.string(),
          name: z.string(),
          slug: z.string(),
        }),
        sessionToken: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user already exists
      const existingUsers = await db
        .select({ id: schema.usersTable.id })
        .from(schema.usersTable)
        .where(eq(schema.usersTable.email, input.email.toLowerCase()))
        .limit(1);

      if (existingUsers.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email address already exists",
        });
      }

      const passwordHash = hashPassword(input.password);
      
      let workspaceSlug = `${input.fullName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-personal`;
      let slugExists = true;
      let counter = 0;
      while (slugExists) {
        const checkSlug = counter === 0 ? workspaceSlug : `${workspaceSlug}-${counter}`;
        const existing = await db.select().from(schema.workspacesTable).where(eq(schema.workspacesTable.slug, checkSlug)).limit(1);
        if (existing.length === 0) {
          workspaceSlug = checkSlug;
          slugExists = false;
        } else {
          counter++;
        }
      }

      const { newUser, newWorkspace } = await db.transaction(async (tx) => {
        const newUserResult = await tx
          .insert(schema.usersTable)
          .values({
            fullName: input.fullName,
            email: input.email.toLowerCase(),
            passwordHash,
            emailVerified: false,
          })
          .returning();
        const newUser = newUserResult[0]!;

        const newWsResult = await tx
          .insert(schema.workspacesTable)
          .values({
            name: `${input.fullName}'s Workspace`,
            slug: workspaceSlug,
            tier: "free",
            removeBranding: false,
          })
          .returning();
        const newWorkspace = newWsResult[0]!;

        await tx.insert(schema.workspaceMembersTable).values({
          workspaceId: newWorkspace.id,
          userId: newUser.id,
          role: "owner",
        });

        return { newUser, newWorkspace };
      });

      // Write session cookie and return token so Next.js frontend can set it too
      const sessionToken = setSessionCookie(ctx.res, newUser.id);

      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
        },
        workspace: {
          id: newWorkspace.id,
          name: newWorkspace.name,
          slug: newWorkspace.slug,
        },
        sessionToken,
      };
    }),

  login: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/login"), tags: TAGS } })
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .output(
      z.object({
        user: z.object({
          id: z.string(),
          email: z.string(),
          fullName: z.string(),
        }),
        workspace: z.object({
          id: z.string(),
          name: z.string(),
          slug: z.string(),
        }),
        sessionToken: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const users = await db
        .select({
          id: schema.usersTable.id,
          email: schema.usersTable.email,
          fullName: schema.usersTable.fullName,
          passwordHash: schema.usersTable.passwordHash,
        })
        .from(schema.usersTable)
        .where(eq(schema.usersTable.email, input.email.toLowerCase()))
        .limit(1);

      if (users.length === 0 || !users[0]?.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password credentials",
        });
      }

      const user = users[0]!;
      const isValid = verifyPassword(input.password, user.passwordHash!);

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password credentials",
        });
      }

      // Fetch user's workspaces
      const memberships = await db
        .select({
          workspace: schema.workspacesTable,
        })
        .from(schema.workspaceMembersTable)
        .innerJoin(
          schema.workspacesTable,
          eq(schema.workspacesTable.id, schema.workspaceMembersTable.workspaceId)
        )
        .where(eq(schema.workspaceMembersTable.userId, user.id))
        .limit(1);

      if (memberships.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "User does not belong to any workspace",
        });
      }

      const sessionToken = setSessionCookie(ctx.res, user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
        workspace: {
          id: memberships[0]!.workspace.id,
          name: memberships[0]!.workspace.name,
          slug: memberships[0]!.workspace.slug,
        },
        sessionToken,
      };
    }),

  demoLogin: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/demo-login"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(
      z.object({
        user: z.object({
          id: z.string(),
          email: z.string(),
          fullName: z.string(),
        }),
        workspace: z.object({
          id: z.string(),
          name: z.string(),
          slug: z.string(),
        }),
      })
    )
    .mutation(async ({ ctx }) => {
      // FIX #4: Use an explicit opt-in env flag, not just NODE_ENV.
      // NODE_ENV is not reliable in some hosting environments.
      const isDemoEnabled = process.env.ENABLE_DEMO_LOGIN === "true";
      if (!isDemoEnabled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Demo login is not available in this environment.",
        });
      }

      // Find the seeded demo user
      const users = await db
        .select({
          id: schema.usersTable.id,
          email: schema.usersTable.email,
          fullName: schema.usersTable.fullName,
        })
        .from(schema.usersTable)
        .where(eq(schema.usersTable.email, "demo@formcraft.com"))
        .limit(1);

      if (users.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Demo user has not been seeded in database. Run pnpm db:seed first.",
        });
      }

      const user = users[0]!;

      // Fetch user's workspaces
      const memberships = await db
        .select({
          workspace: schema.workspacesTable,
        })
        .from(schema.workspaceMembersTable)
        .innerJoin(
          schema.workspacesTable,
          eq(schema.workspacesTable.id, schema.workspaceMembersTable.workspaceId)
        )
        .where(eq(schema.workspaceMembersTable.userId, user.id))
        .limit(1);

      if (memberships.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Demo workspace configuration error",
        });
      }

      setSessionCookie(ctx.res, user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
        workspace: {
          id: memberships[0]!.workspace.id,
          name: memberships[0]!.workspace.name,
          slug: memberships[0]!.workspace.slug,
        },
      };
    }),

  logout: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/logout"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx }) => {
      clearSessionCookie(ctx.res);
      return { success: true };
    }),

  me: publicProcedure // publicProcedure so it doesn't crash on boot, but returns null if unauthenticated
    .meta({ openapi: { method: "GET", path: getPath("/me"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(
      z.object({
        user: z.object({
          id: z.string(),
          email: z.string(),
          fullName: z.string(),
          isSuperAdmin: z.boolean().optional(),
        }).nullable(),
        activeWorkspace: z.object({
          id: z.string(),
          name: z.string(),
          slug: z.string(),
          tier: z.string(),
          removeBranding: z.boolean(),
          customDomain: z.string().nullable(),
        }).nullable(),
        workspaces: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            slug: z.string(),
            tier: z.string(),
            removeBranding: z.boolean(),
            customDomain: z.string().nullable(),
          })
        ),
      })
    )
    .query(async ({ ctx }) => {
      if (!ctx.user) {
        return { user: null, activeWorkspace: null, workspaces: [] };
      }
      // Fetch isSuperAdmin flag from DB
      const dbUsers = await db
        .select({ isSuperAdmin: schema.usersTable.isSuperAdmin })
        .from(schema.usersTable)
        .where(eq(schema.usersTable.id, ctx.user.id))
        .limit(1);
      return {
        user: {
          ...ctx.user,
          isSuperAdmin: dbUsers[0]?.isSuperAdmin ?? false,
        },
        activeWorkspace: ctx.activeWorkspace,
        workspaces: ctx.workspaces,
      };
    }),

  requestPasswordReset: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/request-password-reset"), tags: TAGS } })
    .input(z.object({ email: z.string().email() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input }) => {
      const users = await db
        .select({
          id: schema.usersTable.id,
          email: schema.usersTable.email,
          fullName: schema.usersTable.fullName,
        })
        .from(schema.usersTable)
        .where(eq(schema.usersTable.email, input.email.toLowerCase()))
        .limit(1);

      if (users.length === 0) {
        // Prevent email enumeration
        return { success: true };
      }
      
      const user = users[0]!;
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      
      // Token expires in 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.insert(schema.passwordResetTokensTable).values({
        userId: user.id,
        tokenHash,
        expiresAt,
        used: false,
      });

      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/reset-password?token=${token}`;
      
      const emailHtml = `<p>Hello ${user.fullName},</p><p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetLink}">Reset Password</a></p><p>If you didn't request this, you can safely ignore this email.</p>`;
      
      await sendEmail({
        to: user.email,
        subject: "FormCraft - Password Reset",
        html: emailHtml,
        text: `Reset your password: ${resetLink}`,
      });

      return { success: true };
    }),

  resetPassword: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/reset-password"), tags: TAGS } })
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one uppercase letter, one lowercase letter, and one number"),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input }) => {
      const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
      
      const tokens = await db
        .select()
        .from(schema.passwordResetTokensTable)
        .where(eq(schema.passwordResetTokensTable.tokenHash, tokenHash))
        .limit(1);

      if (tokens.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired token" });
      }

      const resetToken = tokens[0]!;
      
      if (resetToken.used || resetToken.expiresAt < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired token" });
      }

      const passwordHash = hashPassword(input.password);

      await db.transaction(async (tx) => {
        await tx
          .update(schema.usersTable)
          .set({ passwordHash })
          .where(eq(schema.usersTable.id, resetToken.userId));
          
        await tx
          .update(schema.passwordResetTokensTable)
          .set({ used: true })
          .where(eq(schema.passwordResetTokensTable.id, resetToken.id));
      });

      return { success: true };
    }),

  getGoogleAuthUrl: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/google/url"), tags: TAGS } })
    .input(z.object({ redirectUri: z.string() }))
    .output(z.object({ url: z.string() }))
    .query(({ input }) => {
      const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
      if (!clientId || clientId === "dummy-client-id") {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Google Client ID not configured" });
      }

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: input.redirectUri,
        response_type: "code",
        scope: "email profile",
        access_type: "offline",
        prompt: "consent",
      });

      return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
    }),

  googleCallback: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/google/callback"), tags: TAGS } })
    .input(z.object({ code: z.string(), redirectUri: z.string() }))
    .output(z.object({ success: z.boolean(), sessionToken: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;

      if (!clientId || !clientSecret || clientId === "dummy-client-id") {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Google OAuth not configured" });
      }

      // 1. Exchange code for access token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: input.code,
          redirect_uri: input.redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        console.error("Google Token Error:", errorText);
        throw new TRPCError({ code: "BAD_REQUEST", message: "Failed to authenticate with Google" });
      }

      const tokenData = await tokenRes.json();

      // 2. Fetch user profile
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Failed to fetch Google profile" });
      }

      const userData = await userRes.json();
      const email = userData.email.toLowerCase();
      const fullName = userData.name || "Google User";
      const profileImageUrl = userData.picture;

      // 3. Find or create user
      let users = await db
        .select({
          id: schema.usersTable.id,
          email: schema.usersTable.email,
          fullName: schema.usersTable.fullName,
          profileImageUrl: schema.usersTable.profileImageUrl,
        })
        .from(schema.usersTable)
        .where(eq(schema.usersTable.email, email))
        .limit(1);
      let user = users[0];

      if (!user) {
        // Register new user
        let workspaceSlug = `${fullName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-personal`;
        let slugExists = true;
        let counter = 0;
        while (slugExists) {
          const checkSlug = counter === 0 ? workspaceSlug : `${workspaceSlug}-${counter}`;
          const existing = await db.select().from(schema.workspacesTable).where(eq(schema.workspacesTable.slug, checkSlug)).limit(1);
          if (existing.length === 0) {
            workspaceSlug = checkSlug;
            slugExists = false;
          } else {
            counter++;
          }
        }

        const { newUser } = await db.transaction(async (tx) => {
          const newUserResult = await tx
            .insert(schema.usersTable)
            .values({
              fullName,
              email,
              profileImageUrl,
              emailVerified: true,
            })
            .returning();
          const newUser = newUserResult[0]!;

          const newWsResult = await tx
            .insert(schema.workspacesTable)
            .values({
              name: `${fullName}'s Workspace`,
              slug: workspaceSlug,
              tier: "free",
              removeBranding: false,
            })
            .returning();
          const newWorkspace = newWsResult[0]!;

          await tx.insert(schema.workspaceMembersTable).values({
            workspaceId: newWorkspace.id,
            userId: newUser.id,
            role: "owner",
          });

          return { newUser };
        });

        user = newUser;
      } else {
        // Update profile image if missing
        if (!user.profileImageUrl && profileImageUrl) {
          await db.update(schema.usersTable).set({ profileImageUrl }).where(eq(schema.usersTable.id, user.id));
        }
      }

      // 4. Log them in
      const sessionToken = setSessionCookie(ctx.res, user.id);

      return { success: true, sessionToken };
    }),
});
