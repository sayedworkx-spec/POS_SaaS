import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const inventoryValuationRouter = Router();

function canView(role?: string) {
  return role === "admin" || role === "cashier" || role === "warehouse";
}

function serializeRow(product: any) {
  const stock = Number(product.stock);
  const costPrice = Number(product.costPrice);
  const sellPrice = Number(product.sellPrice);
  const lineValue = stock * costPrice;

  return {
    id: Number(product.id),
    sku: String(product.sku),
    barcode: String(product.barcode),
    name: String(product.name),
    stock,
    costPrice,
    sellPrice,
    reorderLevel: Number(product.reorderLevel),
    isActive: Boolean(product.isActive),
    lineValue,
    stockValue: lineValue,
    sellValue: stock * sellPrice,
    potentialGrossMargin: stock * (sellPrice - costPrice),
    status:
      stock <= 0 ? "out_of_stock" : stock <= Number(product.reorderLevel) ? "low_stock" : "ok",
  };
}

inventoryValuationRouter.use(requireAuth);

inventoryValuationRouter.get("/overview", async (req: AuthRequest, res, next) => {
  try {
    if (!canView(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const db = prisma as any;

    const products = await db.product.findMany({
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        stock: true,
        costPrice: true,
        sellPrice: true,
        reorderLevel: true,
        isActive: true,
      },
      orderBy: [{ name: "asc" }],
    });

    const rows = products.map(serializeRow);

    const activeRows = rows.filter((row: any) => row.isActive);
    const inactiveRows = rows.filter((row: any) => !row.isActive);
    const lowStockRows = rows.filter(
      (row: any) => row.stock > 0 && row.stock <= row.reorderLevel
    );
    const zeroStockRows = rows.filter((row: any) => row.stock <= 0);

    const totalQty = rows.reduce((sum: number, row: any) => sum + Number(row.stock), 0);
    const totalInventoryValue = rows.reduce(
      (sum: number, row: any) => sum + Number(row.stockValue),
      0
    );
    const totalSellValue = rows.reduce(
      (sum: number, row: any) => sum + Number(row.sellValue),
      0
    );
    const totalPotentialMargin = rows.reduce(
      (sum: number, row: any) => sum + Number(row.potentialGrossMargin),
      0
    );

    const averageUnitCost = totalQty > 0 ? totalInventoryValue / totalQty : 0;
    const averageUnitSell = totalQty > 0 ? totalSellValue / totalQty : 0;

    const topValueProducts = [...rows]
      .sort((a: any, b: any) => b.stockValue - a.stockValue)
      .slice(0, 20);

    const topQtyProducts = [...rows]
      .sort((a: any, b: any) => b.stock - a.stock)
      .slice(0, 20);

    res.json({
      snapshot: {
        summary: {
          totalProducts: rows.length,
          activeProducts: activeRows.length,
          inactiveProducts: inactiveRows.length,
          lowStockProducts: lowStockRows.length,
          zeroStockProducts: zeroStockRows.length,
          totalQty,
          totalInventoryValue,
          totalSellValue,
          totalPotentialMargin,
          averageUnitCost,
          averageUnitSell,
        },
        rows,
        topValueProducts,
        topQtyProducts,
        lowStockProducts: lowStockRows,
        zeroStockProducts: zeroStockRows,
      },
    });
  } catch (error) {
    next(error);
  }
});