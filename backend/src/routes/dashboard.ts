import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { buildReportSnapshot } from "../lib/reportSnapshot.js";

export const dashboardRouter = Router();

function canView(role?: string) {
  return role === "admin" || role === "cashier" || role === "warehouse";
}

dashboardRouter.use(requireAuth);

dashboardRouter.get("/overview", async (req: AuthRequest, res, next) => {
  try {
    if (!canView(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const snapshot = await buildReportSnapshot({ start, end });

    res.json({
      snapshot: {
        overview: snapshot.overview,
        currentShiftSummary: snapshot.currentShiftSummary,
        recentSales: snapshot.recentSales.slice(0, 8),
        lowStockProducts: snapshot.lowStockProducts,
        topProducts: snapshot.topProducts.slice(0, 8),
      },
    });
  } catch (error) {
    next(error);
  }
});