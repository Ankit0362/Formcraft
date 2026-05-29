import express from "express";
import { logger } from "@repo/logger";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";

import { serverRouter, createContext } from "@repo/trpc/server";
import { db, sql } from "@repo/database";

import { env } from "./env";

export const app = express();

// Trust the first proxy (Render load balancer) so express-rate-limit gets the correct IP
app.set("trust proxy", 1);

// Security headers
const allowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [env.BASE_URL, "http://localhost:3000", "http://localhost:8000"];

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", ...allowedOrigins],
      },
    },
  }),
);

app.disable('x-powered-by');

// Global rate limit: 500 requests per 15 minutes (increased for a real SAAS)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  }),
);

// Stricter rate limit for auth routes
app.use(
  "/api/authentication",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication attempts, please try again later." },
  }),
);

const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "FormCraft OpenAPI",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
});

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile/native apps or curl)
      if (!origin) return cb(null, true);
      if (origin.endsWith('.vercel.app')) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS policy: origin not allowed"));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  return res.json({ message: "Streamyst is up and running..." });
});

app.get("/health", async (req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    return res.json({ message: "FormCraft server is healthy", healthy: true });
  } catch (err) {
    return res.status(503).json({ message: "Database connection failed", healthy: false });
  }
});

logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
app.get("/openapi.json", (req, res) => {
  return res.json(openApiDocument);
});

logger.debug(`docs: ${env.BASE_URL}/docs`);
app.use("/docs", apiReference({ url: "/openapi.json" }));

app.use(
  "/api",
  createOpenApiExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

export default app;
