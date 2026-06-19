import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const dashboardRouter = Router();

function canView(role?: string) {
  return role === "admin" || role === "cashier" || role === "warehouse";
}

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function daysAgo(days: number) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  value.setHours(0, 0, 0, 0);
  return value;
}

function serializeSale(sale: any) {
  return {
    id: Number(sale.id),
    invoiceNumber: String(sale.invoiceNumber),
    saleDate:
      sale.saleDate instanceof Date
        ? sale.saleDate.toISOString()
        : String(sale.saleDate),
    cashier: String(sale.cashier),
    shiftId: Number(sale.shiftId),
    paymentMethod: sale.paymentMethod as "cash" | "card",
    total: Number(sale.total),
    profit: Number(sale.profit),
    itemsCount: Array.isArray(sale.items) ? sale.items.length : 0,
  };
}

function serializeProduct(product: any) {
  return {
    id: Number(product.id),
    sku: String(product.sku),
    barcode: String(product.barcode),
    name: String(product.name),
    stock: Number(product.stock),
    reorderLevel: Number(product.reorderLevel),
    isActive: Boolean(product.isActive),
  };
}

function serializeTopProduct(product: any) {
  return {
    productId: Number(product.productId),
    sku: String(product.sku),
    name: String(product.name),
    stock: Number(product.stock),
    isActive: Boolean(product.isActive),
    quantitySold: Number(product.quantitySold),
    revenue: Number(product.revenue),
    cost: Number(product.cost),
    profit: Number(product.profit),
  };
}

function serializeShift(shift: any) {
  return {
    id: Number(shift.id),
    userId: shift.userId !== null ? Number(shift.userId) : null,
    userName: String(shift.userName),
    openingCash: Number(shift.openingCash),
    closingCash: shift.closingCash !== null ? Number(shift.closingCash) : null,
    actualCash: shift.actualCash !== null ? Number(shift.actualCash) : null,
    difference: shift.difference !== null ? Number(shift.difference) : null,
    status: String(shift.status),
    openedAt:
      shift.openedAt instanceof Date
        ? shift.openedAt.toISOString()
        : String(shift.openedAt),
    closedAt:
      shift.closedAt instanceof Date
        ? shift.closedAt.toISOString()
        : shift.closedAt
          ? String(shift.closedAt)
          : null,
  };
}

type CurrentShiftSummary = {
  shift: ReturnType<typeof serializeShift>;
  openingCash: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
};

dashboardRouter.use(requireAuth);

dashboardRouter.get("/overview", async (req: AuthRequest, res, next) => {
  try {
    if (!canView(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const db = prisma as any;
    const todayStart = startOfDay();
    const rangeStart = daysAgo(30);

    const [
      allProducts,
      openShiftsCount,
      returnsCount,
      todaySales,
      recentSales,
      recentSalesWithItems,
      currentShift,
    ] = await Promise.all([
      db.product.findMany({
        select: {
          id: true,
          sku: true,
          barcode: true,
          name: true,
          stock: true,
          reorderLevel: true,
          isActive: true,
        },
      }),
      db.cashShift.count({ where: { status: "open" } }),
      db.salesReturn.count(),
      db.sale.findMany({
        where: { saleDate: { gte: todayStart } },
        select: { id: true, total: true, profit: true },
      }),
      db.sale.findMany({
        orderBy: { saleDate: "desc" },
        take: 8,
        include: { items: true },
      }),
      db.sale.findMany({
        where: { saleDate: { gte: rangeStart } },
        include: { items: true },
      }),
      db.cashShift.findFirst({
        where: { status: "open" },
        orderBy: { openedAt: "desc" },
      }),
    ]);

    const lowStockList = allProducts
      .filter((product: any) => product.stock <= product.reorderLevel)
      .sort((a: any, b: any) => a.stock - b.stock || a.name.localeCompare(b.name))
      .slice(0, 10);

    const topProductMap = new Map<
      number,
      {
        productId: number;
        quantitySold: number;
        revenue: number;
        cost: number;
      }
    >();

    for (const sale of recentSalesWithItems) {
      for (const item of sale.items) {
        const entry =
          topProductMap.get(item.productId) ??
          {
            productId: item.productId,
            quantitySold: 0,
            revenue: 0,
            cost: 0,
          };

        entry.quantitySold += Number(item.quantity);
        entry.revenue += Number(item.lineTotal);
        entry.cost += Number(item.costTotal);

        topProductMap.set(item.productId, entry);
      }
    }

    const topProductsMaster = Array.from(topProductMap.keys()).length
      ? await db.product.findMany({
          where: { id: { in: Array.from(topProductMap.keys()) } },
          select: {
            id: true,
            sku: true,
            name: true,
            stock: true,
            isActive: true,
          },
        })
      : [];

    const topProducts: Array<ReturnType<typeof serializeTopProduct>> = [];

    for (const [productId, aggregate] of topProductMap.entries()) {
      const master = topProductsMaster.find((item: any) => item.id === productId);
      if (!master) continue;

      topProducts.push(
        serializeTopProduct({
          productId: master.id,
          sku: master.sku,
          name: master.name,
          stock: master.stock,
          isActive: master.isActive,
          quantitySold: aggregate.quantitySold,
          revenue: aggregate.revenue,
          cost: aggregate.cost,
          profit: aggregate.revenue - aggregate.cost,
        })
      );
    }

    topProducts.sort((a, b) => b.quantitySold - a.quantitySold);

    const todayRevenue = todaySales.reduce(
      (sum: number, sale: any) => sum + Number(sale.total),
      0
    );

    const todayProfit = todaySales.reduce(
      (sum: number, sale: any) => sum + Number(sale.profit),
      0
    );

    let currentShiftSummary: CurrentShiftSummary | null = null;

    if (currentShift) {
      const movements = await db.cashMovement.findMany({
        where: { shiftId: currentShift.id },
      });

      const cashIn = movements
        .filter((movement: any) => movement.type === "IN")
        .reduce((sum: number, movement: any) => sum + Number(movement.amount), 0);

      const cashOut = movements
        .filter((movement: any) => movement.type === "OUT")
        .reduce((sum: number, movement: any) => sum + Number(movement.amount), 0);

      const expectedCash = Number(currentShift.openingCash) + cashIn - cashOut;
      const actualCash =
        currentShift.actualCash !== null
          ? Number(currentShift.actualCash)
          : expectedCash;
      const difference =
        currentShift.difference !== null
          ? Number(currentShift.difference)
          : actualCash - expectedCash;

      currentShiftSummary = {
        shift: serializeShift(currentShift),
        openingCash: Number(currentShift.openingCash),
        cashIn,
        cashOut,
        expectedCash,
        actualCash,
        difference,
      };
    }

    res.json({
      snapshot: {
        overview: {
          totalProducts: allProducts.length,
          activeProducts: allProducts.filter((product: any) => product.isActive).length,
          lowStockProducts: lowStockList.length,
          todaySalesCount: todaySales.length,
          todayRevenue,
          todayProfit,
          returnsCount,
          openShiftsCount,
        },
        currentShiftSummary,
        recentSales: recentSales.map(serializeSale),
        lowStockProducts: lowStockList.map(serializeProduct),
        topProducts: topProducts.slice(0, 8),
      },
    });
  } catch (error) {
    next(error);
  }
});