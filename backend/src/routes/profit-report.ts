import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const profitReportRouter = Router();

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function canView(role?: string) {
  return role === "admin";
}

function startOfMonth(date = new Date()) {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function toDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
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

function serializeReturn(ret: any) {
  return {
    id: Number(ret.id),
    returnNumber: String(ret.returnNumber),
    returnDate:
      ret.returnDate instanceof Date
        ? ret.returnDate.toISOString()
        : String(ret.returnDate),
    invoiceNumber: String(ret.invoiceNumber),
    cashier: String(ret.cashier),
    refundMethod: ret.refundMethod as "cash" | "card",
    refundAmount: Number(ret.refundAmount),
    itemCount: Array.isArray(ret.items) ? ret.items.length : 0,
  };
}

function serializeExpense(expense: any) {
  return {
    id: Number(expense.id),
    expenseNumber: String(expense.expenseNumber),
    expenseDate:
      expense.expenseDate instanceof Date
        ? expense.expenseDate.toISOString()
        : String(expense.expenseDate),
    category: String(expense.category),
    description: String(expense.description),
    amount: Number(expense.amount),
    paymentMethod: expense.paymentMethod as "cash" | "card",
    shiftId: expense.shiftId !== null ? Number(expense.shiftId) : null,
    createdBy: String(expense.createdBy),
  };
}

function serializeDailyRow(row: any) {
  return {
    date: row.date,
    salesCount: Number(row.salesCount),
    revenueGross: Number(row.revenueGross),
    cogsGross: Number(row.cogsGross),
    grossProfit: Number(row.grossProfit),
    returnsCount: Number(row.returnsCount),
    refundAmount: Number(row.refundAmount),
    returnedCost: Number(row.returnedCost),
    expensesCount: Number(row.expensesCount),
    expensesCash: Number(row.expensesCash),
    expensesCard: Number(row.expensesCard),
    totalExpenses: Number(row.totalExpenses),
    netProfit: Number(row.netProfit),
  };
}

function serializeTopProduct(product: any) {
  return {
    productId: Number(product.productId),
    sku: String(product.sku),
    name: String(product.name),
    quantitySold: Number(product.quantitySold),
    revenue: Number(product.revenue),
    cost: Number(product.cost),
    profit: Number(product.profit),
  };
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

    const start = parseFlexibleDate(parsed.data.startDate, startOfMonth(), "start");
    const end = parseFlexibleDate(parsed.data.endDate, endOfDay(), "end");

    const db = prisma as any;

    const [sales, returnsList, movements, expensesList, allProducts] =
      await Promise.all([
        db.sale.findMany({
          where: {
            saleDate: {
              gte: start,
              lte: end,
            },
          },
          include: { items: true },
          orderBy: { saleDate: "desc" },
        }),
        db.salesReturn.findMany({
          where: {
            returnDate: {
              gte: start,
              lte: end,
            },
          },
          include: {
            items: true,
            sale: {
              include: {
                items: true,
              },
            },
          },
          orderBy: { returnDate: "desc" },
        }),
        db.cashMovement.findMany({
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        db.expense.findMany({
          where: {
            expenseDate: {
              gte: start,
              lte: end,
            },
          },
          orderBy: { expenseDate: "desc" },
        }),
        db.product.findMany({
          select: {
            id: true,
            sku: true,
            name: true,
            stock: true,
            reorderLevel: true,
            isActive: true,
          },
        }),
      ]);

    const grossRevenue = sales.reduce(
      (sum: number, sale: any) => sum + Number(sale.total),
      0
    );
    const grossCOGS = sales.reduce(
      (sum: number, sale: any) => sum + Number(sale.costTotal),
      0
    );
    const grossProfit = sales.reduce(
      (sum: number, sale: any) => sum + Number(sale.profit),
      0
    );

    let refundAmount = 0;
    let returnedCost = 0;

    for (const ret of returnsList) {
      refundAmount += Number(ret.refundAmount);

      for (const retItem of ret.items) {
        const sourceItem = ret.sale.items.find(
          (saleItem: any) => saleItem.productId === retItem.productId
        );

        if (sourceItem) {
          returnedCost += Number(sourceItem.costPrice) * Number(retItem.quantity);
        }
      }
    }

    const cashExpenses = expensesList
      .filter((expense: any) => expense.paymentMethod === "cash")
      .reduce((sum: number, expense: any) => sum + Number(expense.amount), 0);

    const cardExpenses = expensesList
      .filter((expense: any) => expense.paymentMethod === "card")
      .reduce((sum: number, expense: any) => sum + Number(expense.amount), 0);

    const totalExpenses = cashExpenses + cardExpenses;

    const netRevenue = grossRevenue - refundAmount;
    const netCOGS = grossCOGS - returnedCost;
    const operatingProfit = netRevenue - netCOGS;
    const netProfit = operatingProfit - totalExpenses;

    const cashIn = movements
      .filter((movement: any) => movement.type === "IN")
      .reduce((sum: number, movement: any) => sum + Number(movement.amount), 0);

    const cashOut = movements
      .filter((movement: any) => movement.type === "OUT")
      .reduce((sum: number, movement: any) => sum + Number(movement.amount), 0);

    const netCash = cashIn - cashOut;

    const averageOrderValue = sales.length > 0 ? grossRevenue / sales.length : 0;
    const marginPercent = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

    type DailyAgg = {
      date: string;
      salesCount: number;
      revenueGross: number;
      cogsGross: number;
      grossProfit: number;
      returnsCount: number;
      refundAmount: number;
      returnedCost: number;
      expensesCount: number;
      expensesCash: number;
      expensesCard: number;
      totalExpenses: number;
      netProfit: number;
    };

    const dailyMap = new Map<string, DailyAgg>();

    for (const sale of sales) {
      const key = toDateKey(sale.saleDate);

      const entry =
        dailyMap.get(key) ??
        {
          date: key,
          salesCount: 0,
          revenueGross: 0,
          cogsGross: 0,
          grossProfit: 0,
          returnsCount: 0,
          refundAmount: 0,
          returnedCost: 0,
          expensesCount: 0,
          expensesCash: 0,
          expensesCard: 0,
          totalExpenses: 0,
          netProfit: 0,
        };

      entry.salesCount += 1;
      entry.revenueGross += Number(sale.total);
      entry.cogsGross += Number(sale.costTotal);
      entry.grossProfit += Number(sale.profit);

      dailyMap.set(key, entry);
    }

    for (const ret of returnsList) {
      const key = toDateKey(ret.returnDate);

      const entry =
        dailyMap.get(key) ??
        {
          date: key,
          salesCount: 0,
          revenueGross: 0,
          cogsGross: 0,
          grossProfit: 0,
          returnsCount: 0,
          refundAmount: 0,
          returnedCost: 0,
          expensesCount: 0,
          expensesCash: 0,
          expensesCard: 0,
          totalExpenses: 0,
          netProfit: 0,
        };

      let localReturnedCost = 0;

      for (const retItem of ret.items) {
        const sourceItem = ret.sale.items.find(
          (saleItem: any) => saleItem.productId === retItem.productId
        );

        if (sourceItem) {
          localReturnedCost += Number(sourceItem.costPrice) * Number(retItem.quantity);
        }
      }

      entry.returnsCount += 1;
      entry.refundAmount += Number(ret.refundAmount);
      entry.returnedCost += localReturnedCost;

      dailyMap.set(key, entry);
    }

    for (const expense of expensesList) {
      const key = toDateKey(expense.expenseDate);

      const entry =
        dailyMap.get(key) ??
        {
          date: key,
          salesCount: 0,
          revenueGross: 0,
          cogsGross: 0,
          grossProfit: 0,
          returnsCount: 0,
          refundAmount: 0,
          returnedCost: 0,
          expensesCount: 0,
          expensesCash: 0,
          expensesCard: 0,
          totalExpenses: 0,
          netProfit: 0,
        };

      const amount = Number(expense.amount);

      entry.expensesCount += 1;

      if (expense.paymentMethod === "cash") {
        entry.expensesCash += amount;
      } else {
        entry.expensesCard += amount;
      }

      entry.totalExpenses += amount;

      dailyMap.set(key, entry);
    }

    const dailyRows = Array.from(dailyMap.values())
      .map((row) => ({
        ...row,
        netProfit:
          row.grossProfit - row.refundAmount + row.returnedCost - row.totalExpenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const productMap = new Map<
      number,
      {
        productId: number;
        sku: string;
        name: string;
        quantitySold: number;
        revenue: number;
        cost: number;
      }
    >();

    for (const sale of sales) {
      for (const item of sale.items) {
        const entry =
          productMap.get(item.productId) ??
          {
            productId: item.productId,
            sku: item.sku,
            name: item.name,
            quantitySold: 0,
            revenue: 0,
            cost: 0,
          };

        entry.quantitySold += Number(item.quantity);
        entry.revenue += Number(item.lineTotal);
        entry.cost += Number(item.costTotal);

        productMap.set(item.productId, entry);
      }
    }

    const topProducts = Array.from(productMap.values())
      .map((item) => ({
        ...item,
        profit: item.revenue - item.cost,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    const lowStockProducts = allProducts
      .filter((product: any) => product.stock <= product.reorderLevel)
      .sort((a: any, b: any) => a.stock - b.stock || a.name.localeCompare(b.name))
      .slice(0, 10);

    const expensesByCategoryMap = new Map<
      string,
      { category: string; amount: number; count: number }
    >();

    for (const expense of expensesList) {
      const category = String(expense.category);
      const entry =
        expensesByCategoryMap.get(category) ??
        {
          category,
          amount: 0,
          count: 0,
        };

      entry.amount += Number(expense.amount);
      entry.count += 1;

      expensesByCategoryMap.set(category, entry);
    }

    const expensesByCategory = Array.from(expensesByCategoryMap.values()).sort(
      (a, b) => b.amount - a.amount
    );

    res.json({
      report: {
        range: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        totals: {
          salesCount: sales.length,
          returnsCount: returnsList.length,
          expensesCount: expensesList.length,
          grossRevenue,
          grossCOGS,
          grossProfit,
          refundAmount,
          returnedCost,
          netRevenue,
          netCOGS,
          operatingProfit,
          totalExpenses,
          cashExpenses,
          cardExpenses,
          netProfit,
          cashIn,
          cashOut,
          netCash,
          averageOrderValue,
          marginPercent,
        },
        dailyRows: dailyRows.map(serializeDailyRow),
        topProducts: topProducts.map(serializeTopProduct),
        lowStockProducts: lowStockProducts.map((product: any) => ({
          id: Number(product.id),
          sku: String(product.sku),
          name: String(product.name),
          stock: Number(product.stock),
          reorderLevel: Number(product.reorderLevel),
          isActive: Boolean(product.isActive),
        })),
        expensesByCategory,
        recentSales: sales.slice(0, 10).map(serializeSale),
        recentReturns: returnsList.slice(0, 10).map(serializeReturn),
        recentExpenses: expensesList.slice(0, 10).map(serializeExpense),
      },
    });
  } catch (error) {
    next(error);
  }
});