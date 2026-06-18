import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "pos-saas-backend",
    timestamp: new Date().toISOString(),
  });
});