import { Router } from "express";
import { z } from "zod";

import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { buildReportSnapshot } from "../lib/reportSnapshot.js";

export const profitReportRouter = Router();

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function canView(role?: string) {
  return role === "admin";
}

function parseFlexibleDate(
  input?: string,
  fallback?: Date,
  mode: "start" | "end" = "start"
) {
  if (!input) {
    return fallback ? new Date(fallback) : new Date();
  }

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(input);
  const parsed = isDateOnly ? new Date(`${input}T00:00:00`) : new Date(input);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date range");
  }

  if (isDateOnly && mode === "end") {
    parsed.setHours(23, 59, 59, 999);
  }

  return parsed;
}

profitReportRouter.use(requireAuth);

profitReportRouter.get("/overview", async (req: AuthRequest, res, next) => {
  try {
    if (!canView(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const parsed = querySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid query parameters" });
    }

    const start = parseFlexibleDate(
      parsed.data.startDate,
      (() => {
        const d = new Date();
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
      })(),
      "start"
    );

    const end = parseFlexibleDate(
      parsed.data.endDate,
      (() => {
        const d = new Date();
        d.setHours(23, 59, 59, 999);
        return d;
      })(),
      "end"
    );

    const snapshot = await buildReportSnapshot({ start, end });

    res.json({
      report: {
        range: snapshot.range,
        overview: snapshot.overview,
        inventory: snapshot.inventory,
        totals: snapshot.totals,
        dailyRows: snapshot.dailyRows,
        topProducts: snapshot.topProducts,
        lowStockProducts: snapshot.lowStockProducts,
        expensesByCategory: snapshot.expensesByCategory,
        recentSales: snapshot.recentSales,
        recentReturns: snapshot.recentReturns,
        recentExpenses: snapshot.recentExpenses,
      },
    });
  } catch (error) {
    next(error);
  }
});