import { apiFetch, readApiError } from "./api";
import type { ExecutiveSummarySnapshot } from "../types/ExecutiveSummary";

const EXECUTIVE_SUMMARY_CACHE_KEY = "executive_summary_snapshot";

function normalizeSnapshot(raw: any): ExecutiveSummarySnapshot {
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
    currentShiftSummary: raw?.currentShiftSummary
      ? {
          shift: {
            id: Number(raw.currentShiftSummary.shift?.id ?? 0),
            userId:
              raw.currentShiftSummary.shift?.userId === null ||
              raw.currentShiftSummary.shift?.userId === undefined
                ? null
                : Number(raw.currentShiftSummary.shift.userId),
            userName: String(raw.currentShiftSummary.shift?.userName ?? ""),
            openingCash: Number(raw.currentShiftSummary.shift?.openingCash ?? 0),
            closingCash:
              raw.currentShiftSummary.shift?.closingCash === null ||
              raw.currentShiftSummary.shift?.closingCash === undefined
                ? null
                : Number(raw.currentShiftSummary.shift.closingCash),
            actualCash:
              raw.currentShiftSummary.shift?.actualCash === null ||
              raw.currentShiftSummary.shift?.actualCash === undefined
                ? null
                : Number(raw.currentShiftSummary.shift.actualCash),
            difference:
              raw.currentShiftSummary.shift?.difference === null ||
              raw.currentShiftSummary.shift?.difference === undefined
                ? null
                : Number(raw.currentShiftSummary.shift.difference),
            status: String(raw.currentShiftSummary.shift?.status ?? "open"),
            openedAt: String(raw.currentShiftSummary.shift?.openedAt ?? new Date().toISOString()),
            closedAt:
              raw.currentShiftSummary.shift?.closedAt === null ||
              raw.currentShiftSummary.shift?.closedAt === undefined
                ? null
                : String(raw.currentShiftSummary.shift.closedAt),
          },
          openingCash: Number(raw.currentShiftSummary.openingCash ?? 0),
          cashIn: Number(raw.currentShiftSummary.cashIn ?? 0),
          cashOut: Number(raw.currentShiftSummary.cashOut ?? 0),
          expectedCash: Number(raw.currentShiftSummary.expectedCash ?? 0),
          actualCash: Number(raw.currentShiftSummary.actualCash ?? 0),
          difference: Number(raw.currentShiftSummary.difference ?? 0),
        }
      : null,
    alerts: Array.isArray(raw?.alerts)
      ? raw.alerts.map((item: any) => ({
          level:
            item?.level === "critical"
              ? "critical"
              : item?.level === "warning"
                ? "warning"
                : "info",
          title: String(item?.title ?? ""),
          details: String(item?.details ?? ""),
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

function readCache(): ExecutiveSummarySnapshot | null {
  const raw = localStorage.getItem(EXECUTIVE_SUMMARY_CACHE_KEY);

  if (!raw) return null;

  try {
    return normalizeSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeCache(snapshot: ExecutiveSummarySnapshot) {
  localStorage.setItem(EXECUTIVE_SUMMARY_CACHE_KEY, JSON.stringify(snapshot));
}

export function getExecutiveSummarySnapshot(): ExecutiveSummarySnapshot | null {
  return readCache();
}

export async function syncExecutiveSummaryCache() {
  const response = await apiFetch("/executive-summary/overview");

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { summary?: unknown };
  const snapshot = normalizeSnapshot(payload.summary ?? payload);

  writeCache(snapshot);
  return snapshot;
}