import { Router } from "express";

import { buildReportSnapshot } from "../lib/reportSnapshot.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const profitReportRouter = Router();

function canView(role?: string) {
  return role === "admin";
}

function startOfMonth(date = new Date()) {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfNow(date = new Date()) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

profitReportRouter.use(requireAuth);

profitReportRouter.get("/overview", async (req: AuthRequest, res, next) => {
  try {
    if (!canView(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const startDate =
      typeof req.query.startDate === "string" && req.query.startDate
        ? new Date(req.query.startDate)
        : startOfMonth();

    const endDate =
      typeof req.query.endDate === "string" && req.query.endDate
        ? new Date(req.query.endDate)
        : endOfNow();

    const report = await buildReportSnapshot({
      start: startDate,
      end: endDate,
    });

    res.json({ report });
  } catch (error) {
    next(error);
  }
});