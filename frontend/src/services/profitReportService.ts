import { apiFetch, readApiError } from "./api";
import type { ProfitReportSnapshot } from "../types/ProfitReport";

const PROFIT_REPORT_CACHE_KEY = "profit_report_snapshot";

function normalizeSnapshot(raw: any): ProfitReportSnapshot {
  return {
    range: {
      startDate: String(raw?.range?.startDate ?? new Date().toISOString()),
      endDate: String(raw?.range?.endDate ?? new Date().toISOString()),
    },
    overview: {
      totalProducts: Number(raw?.overview?.totalProducts ?? 0),
      activeProducts: Number(raw?.overview?.activeProducts ?? 0),
      lowStockProducts: Number(raw?.overview?.lowStockProducts ?? 0),
      todaySalesCount: Number(raw?.overview?.todaySalesCount ?? 0),
      todayRevenue: Number(raw?.overview?.todayRevenue ?? 0),
      todayProfit: Number(raw?.overview?.todayProfit ?? 0),
      returnsCount: Number(raw?.overview?.returnsCount ?? 0),
      openShiftsCount: Number(raw?.overview?.openShiftsCount ?? 0),
    },
    inventory: {
      endingQty: Number(raw?.inventory?.endingQty ?? 0),
      endingInventoryValue: Number(raw?.inventory?.endingInventoryValue ?? 0),
      endingInventorySellValue: Number(raw?.inventory?.endingInventorySellValue ?? 0),
      inventoryPotentialMargin: Number(raw?.inventory?.inventoryPotentialMargin ?? 0),
      lowStockCount: Number(raw?.inventory?.lowStockCount ?? 0),
      zeroStockCount: Number(raw?.inventory?.zeroStockCount ?? 0),
      activeProducts: Number(raw?.inventory?.activeProducts ?? 0),
      inactiveProducts: Number(raw?.inventory?.inactiveProducts ?? 0),
    },
    totals: {
      salesCount: Number(raw?.totals?.salesCount ?? 0),
      returnsCount: Number(raw?.totals?.returnsCount ?? 0),
      expensesCount: Number(raw?.totals?.expensesCount ?? 0),
      grossRevenue: Number(raw?.totals?.grossRevenue ?? 0),
      grossCOGS: Number(raw?.totals?.grossCOGS ?? 0),
      grossProfit: Number(raw?.totals?.grossProfit ?? 0),
      refundAmount: Number(raw?.totals?.refundAmount ?? 0),
      returnedCost: Number(raw?.totals?.returnedCost ?? 0),
      netRevenue: Number(raw?.totals?.netRevenue ?? 0),
      netCOGS: Number(raw?.totals?.netCOGS ?? 0),
      operatingProfit: Number(raw?.totals?.operatingProfit ?? 0),
      totalExpenses: Number(raw?.totals?.totalExpenses ?? 0),
      cashExpenses: Number(raw?.totals?.cashExpenses ?? 0),
      cardExpenses: Number(raw?.totals?.cardExpenses ?? 0),
      netProfit: Number(raw?.totals?.netProfit ?? 0),
      cashIn: Number(raw?.totals?.cashIn ?? 0),
      cashOut: Number(raw?.totals?.cashOut ?? 0),
      netCash: Number(raw?.totals?.netCash ?? 0),
      averageOrderValue: Number(raw?.totals?.averageOrderValue ?? 0),
      marginPercent: Number(raw?.totals?.marginPercent ?? 0),
    },
    dailyRows: Array.isArray(raw?.dailyRows)
      ? raw.dailyRows.map((item: any) => ({
          date: String(item?.date ?? ""),
          salesCount: Number(item?.salesCount ?? 0),
          revenueGross: Number(item?.revenueGross ?? 0),
          cogsGross: Number(item?.cogsGross ?? 0),
          grossProfit: Number(item?.grossProfit ?? 0),
          returnsCount: Number(item?.returnsCount ?? 0),
          refundAmount: Number(item?.refundAmount ?? 0),
          returnedCost: Number(item?.returnedCost ?? 0),
          expensesCount: Number(item?.expensesCount ?? 0),
          expensesCash: Number(item?.expensesCash ?? 0),
          expensesCard: Number(item?.expensesCard ?? 0),
          totalExpenses: Number(item?.totalExpenses ?? 0),
          netProfit: Number(item?.netProfit ?? 0),
        }))
      : [],
    topProducts: Array.isArray(raw?.topProducts)
      ? raw.topProducts.map((item: any) => ({
          productId: Number(item?.productId ?? 0),
          sku: String(item?.sku ?? ""),
          name: String(item?.name ?? ""),
          quantitySold: Number(item?.quantitySold ?? 0),
          revenue: Number(item?.revenue ?? 0),
          cost: Number(item?.cost ?? 0),
          profit: Number(item?.profit ?? 0),
        }))
      : [],
    lowStockProducts: Array.isArray(raw?.lowStockProducts)
      ? raw.lowStockProducts.map((item: any) => ({
          id: Number(item?.id ?? 0),
          sku: String(item?.sku ?? ""),
          name: String(item?.name ?? ""),
          stock: Number(item?.stock ?? 0),
          reorderLevel: Number(item?.reorderLevel ?? 0),
          isActive: Boolean(item?.isActive ?? true),
        }))
      : [],
    expensesByCategory: Array.isArray(raw?.expensesByCategory)
      ? raw.expensesByCategory.map((item: any) => ({
          category: String(item?.category ?? ""),
          amount: Number(item?.amount ?? 0),
          count: Number(item?.count ?? 0),
        }))
      : [],
    recentSales: Array.isArray(raw?.recentSales)
      ? raw.recentSales.map((item: any) => ({
          id: Number(item?.id ?? 0),
          invoiceNumber: String(item?.invoiceNumber ?? ""),
          saleDate: String(item?.saleDate ?? new Date().toISOString()),
          cashier: String(item?.cashier ?? ""),
          shiftId: Number(item?.shiftId ?? 0),
          paymentMethod: item?.paymentMethod === "card" ? "card" : "cash",
          total: Number(item?.total ?? 0),
          profit: Number(item?.profit ?? 0),
          itemsCount: Number(item?.itemsCount ?? 0),
        }))
      : [],
    recentReturns: Array.isArray(raw?.recentReturns)
      ? raw.recentReturns.map((item: any) => ({
          id: Number(item?.id ?? 0),
          returnNumber: String(item?.returnNumber ?? ""),
          returnDate: String(item?.returnDate ?? new Date().toISOString()),
          invoiceNumber: String(item?.invoiceNumber ?? ""),
          cashier: String(item?.cashier ?? ""),
          refundMethod: item?.refundMethod === "card" ? "card" : "cash",
          refundAmount: Number(item?.refundAmount ?? 0),
          itemCount: Number(item?.itemCount ?? 0),
        }))
      : [],
    recentExpenses: Array.isArray(raw?.recentExpenses)
      ? raw.recentExpenses.map((item: any) => ({
          id: Number(item?.id ?? 0),
          expenseNumber: String(item?.expenseNumber ?? ""),
          expenseDate: String(item?.expenseDate ?? new Date().toISOString()),
          category: String(item?.category ?? ""),
          description: String(item?.description ?? ""),
          amount: Number(item?.amount ?? 0),
          paymentMethod: item?.paymentMethod === "card" ? "card" : "cash",
          shiftId:
            item?.shiftId === null || item?.shiftId === undefined
              ? null
              : Number(item.shiftId),
          createdBy: String(item?.createdBy ?? ""),
        }))
      : [],
  };
}

function readCache(): ProfitReportSnapshot | null {
  const raw = localStorage.getItem(PROFIT_REPORT_CACHE_KEY);

  if (!raw) return null;

  try {
    return normalizeSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeCache(snapshot: ProfitReportSnapshot) {
  localStorage.setItem(PROFIT_REPORT_CACHE_KEY, JSON.stringify(snapshot));
}

export function getProfitReportSnapshot(): ProfitReportSnapshot | null {
  return readCache();
}

export async function syncProfitReportCache(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();

  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const query = params.toString();
  const response = await apiFetch(
    `/profit-report/overview${query ? `?${query}` : ""}`
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { report?: unknown };

  const snapshot = normalizeSnapshot(payload.report ?? payload);
  writeCache(snapshot);

  return snapshot;
}