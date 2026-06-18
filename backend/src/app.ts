import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(helmet());
  app.use(express.json({ limit: "2mb" }));

  app.get("/", (req, res) => {
    res.json({
      message: "POS SaaS Backend API",
    });
  });

  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}