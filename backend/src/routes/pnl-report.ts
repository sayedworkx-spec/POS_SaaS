import { Router } from "express";
import { z } from "zod";

import { buildReportSnapshot } from "../lib/reportSnapshot.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const pnlReportRouter = Router();

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

pnlReportRouter.use(requireAuth);

pnlReportRouter.get("/overview", async (req: AuthRequest, res, next) => {
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

    const s = snapshot.totals;
    const i = snapshot.inventory;

    const statementLines = [
      { label: "Sales Revenue", amount: s.grossRevenue, kind: "positive" as const },
      { label: "Less: Returns Refunds", amount: -s.refundAmount, kind: "negative" as const },
      { label: "Net Sales", amount: s.netRevenue, kind: "subtotal" as const },
      { label: "Less: Cost of Goods Sold", amount: -s.netCOGS, kind: "negative" as const },
      { label: "Gross Profit", amount: s.operatingProfit, kind: "subtotal" as const },
      { label: "Less: Operating Expenses", amount: -s.totalExpenses, kind: "negative" as const },
      { label: "Net Profit", amount: s.netProfit, kind: "total" as const },
    ];

    res.json({
      report: {
        range: snapshot.range,
        overview: snapshot.overview,
        inventory: snapshot.inventory,
        statementLines,
        totals: snapshot.totals,
        dailyRows: snapshot.dailyRows,
        topProducts: snapshot.topProducts,
        lowStockProducts: snapshot.lowStockProducts,
        expensesByCategory: snapshot.expensesByCategory,
        recentSales: snapshot.recentSales,
        recentReturns: snapshot.recentReturns,
        recentExpenses: snapshot.recentExpenses,
        inventoryBridge: {
          endingQty: i.endingQty,
          endingInventoryValue: i.endingInventoryValue,
          endingInventorySellValue: i.endingInventorySellValue,
          inventoryPotentialMargin: i.inventoryPotentialMargin,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});