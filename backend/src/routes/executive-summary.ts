import { Router } from "express";

import { buildReportSnapshot } from "../lib/reportSnapshot.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const executiveSummaryRouter = Router();

function canView(role?: string) {
  return role === "admin" || role === "cashier" || role === "warehouse";
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

function buildAlerts(snapshot: Awaited<ReturnType<typeof buildReportSnapshot>>) {
  const alerts: Array<{
    level: "info" | "warning" | "critical";
    title: string;
    details: string;
  }> = [];

  if (snapshot.lowStockProducts.length > 0) {
    alerts.push({
      level: "warning",
      title: "Low stock items",
      details: `${snapshot.lowStockProducts.length} products need replenishment.`,
    });
  }

  if (snapshot.inventory.zeroStockCount > 0) {
    alerts.push({
      level: "critical",
      title: "Out of stock items",
      details: `${snapshot.inventory.zeroStockCount} products are fully out of stock.`,
    });
  }

  if (snapshot.totals.netProfit < 0) {
    alerts.push({
      level: "critical",
      title: "Net loss",
      details: "The selected period is currently showing a net loss.",
    });
  } else {
    alerts.push({
      level: "info",
      title: "Net profit",
      details: "The selected period is profitable.",
    });
  }

  if (snapshot.currentShiftSummary && Math.abs(snapshot.currentShiftSummary.difference) > 0) {
    alerts.push({
      level: "warning",
      title: "Cash variance",
      details: `Current shift difference is ${snapshot.currentShiftSummary.difference}.`,
    });
  }

  if (snapshot.totals.totalExpenses > snapshot.totals.grossProfit) {
    alerts.push({
      level: "warning",
      title: "Expenses exceed gross profit",
      details: "Operating expenses are higher than gross profit for the selected period.",
    });
  }

  return alerts;
}

executiveSummaryRouter.use(requireAuth);

executiveSummaryRouter.get("/overview", async (req: AuthRequest, res, next) => {
  try {
    if (!canView(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const snapshot = await buildReportSnapshot({
      start: startOfMonth(),
      end: endOfNow(),
    });

    const alerts = buildAlerts(snapshot);

    res.json({
      summary: {
        range: snapshot.range,
        overview: snapshot.overview,
        inventory: snapshot.inventory,
        totals: snapshot.totals,
        currentShiftSummary: snapshot.currentShiftSummary,
        alerts,
        lowStockProducts: snapshot.lowStockProducts.slice(0, 5),
        topProducts: snapshot.topProducts.slice(0, 5),
        recentSales: snapshot.recentSales.slice(0, 5),
        recentExpenses: snapshot.recentExpenses.slice(0, 5),
      },
    });
  } catch (error) {
    next(error);
  }
});