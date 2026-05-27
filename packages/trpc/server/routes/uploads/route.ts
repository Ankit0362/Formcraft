import { z } from "zod";
import { publicProcedure, workspaceProcedure, router } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db, eq } from "@repo/database";
import * as schema from "@repo/database/schema";
import crypto from "node:crypto";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT || "",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

export const uploadsRouter = router({
  /**
   * Generates a temporary, secure URL for the frontend to upload a file directly to Cloudflare R2
   */
  getPresignedUrl: publicProcedure
    .input(z.object({
      formId: z.string().uuid(),
      fileName: z.string(),
      contentType: z.string(),
    }))
    .mutation(async ({ input }) => {
      if (!process.env.S3_ENDPOINT || !process.env.S3_BUCKET_NAME) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "S3 credentials are not configured",
        });
      }

      // Generate a secure, unique object key
      const ext = input.fileName.split('.').pop();
      const uniqueFileName = `${crypto.randomUUID()}.${ext}`;
      const objectKey = `uploads/forms/${input.formId}/${uniqueFileName}`;

      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: objectKey,
        ContentType: input.contentType,
      });

      try {
        // Generates a URL valid for 15 minutes
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
        
        return {
          uploadUrl: signedUrl,
          objectKey: objectKey,
        };
      } catch (error) {
        console.error("Failed to generate pre-signed URL", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate upload URL",
        });
      }
    }),

  /**
   * Generates a temporary, secure URL for the form owner to download/view the uploaded file
   */
  getDownloadUrl: workspaceProcedure
    .input(z.object({
      objectKey: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      if (!process.env.S3_ENDPOINT || !process.env.S3_BUCKET_NAME) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "S3 credentials are not configured",
        });
      }

      // Security Fix #3: Verify ownership of the file before generating download URL
      // objectKey format: uploads/forms/{formId}/{uuid}.{ext}
      const parts = input.objectKey.split('/');
      if (parts.length >= 3 && parts[0] === 'uploads' && parts[1] === 'forms') {
        const formId = parts[2] as string;
        const forms = await db.select().from(schema.formsTable).where(eq(schema.formsTable.id, formId)).limit(1);
        const form = forms[0];

        if (!form || form.workspaceId !== ctx.activeWorkspace.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to access this file.",
          });
        }
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid file path format.",
        });
      }

      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: input.objectKey,
      });

      try {
        // Generates a URL valid for 1 hour
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        
        return {
          downloadUrl: signedUrl,
        };
      } catch (error) {
        console.error("Failed to generate pre-signed download URL", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate download URL",
        });
      }
    }),
});
