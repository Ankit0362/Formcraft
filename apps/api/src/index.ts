import http from "node:http";
import { logger } from "@repo/logger";
import { app as expressApplication } from "./server";
import { pool } from "@repo/database";

import { env } from "./env";

async function init() {
  try {
    const server = http.createServer(expressApplication);
    const PORT: number = env.PORT ? +env.PORT : 8000;
    server.listen(PORT, () => {
      logger.info(`http server is running on PORT ${PORT}`);
    });

    const shutdown = async () => {
      logger.info("Gracefully shutting down server...");
      server.close(async () => {
        logger.info("HTTP server closed.");
        await pool.end();
        logger.info("Database pool closed.");
        process.exit(0);
      });
      // Force close if it takes too long
      setTimeout(() => {
        logger.error("Could not close connections in time, forcefully shutting down");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

  } catch (err) {
    logger.error(`Error creating http server`, { err });
    process.exit(1);
  }
}

init();
