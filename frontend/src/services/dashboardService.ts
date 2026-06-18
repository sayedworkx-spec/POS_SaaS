import { apiFetch, readApiError } from "./api";
import type { DashboardSnapshot } from "../types/Dashboard";
import type {
  CashRegisterSummary,
  CashShift,
  CashMovement,
} from "../types/CashRegister";

const DASHBOARD_CACHE_KEY = "dashboard_snapshot";

function normalizeShift(raw: any): CashShift {
  return {
    id: Number(raw?.id ?? Date.now()),
    userId:
      raw?.userId === null || raw?.userId === undefined
        ? null
        : Number(raw.userId),
    userName: String(raw?.userName ?? "Cashier"),
    openingCash: Number(raw?.openingCash ?? 0),
    closingCash:
      raw?.closingCash === null || raw?.closingCash === undefined
        ? null
        : Number(raw.closingCash),
    actualCash:
      raw?.actualCash === null || raw?.actualCash === undefined
        ? null
        : Number(raw.actualCash),
    difference:
      raw?.difference === null || raw?.difference === undefined
        ? null
        : Number(raw.difference),
    status: raw?.status === "closed" ? "closed" : "open",
    openedAt:
      typeof raw?.openedAt === "string"
        ? raw.openedAt
        : new Date(raw?.openedAt ?? Date.now()).toISOString(),
    closedAt:
      raw?.closedAt === null || raw?.closedAt === undefined
        ? null
        : typeof raw.closedAt === "string"
          ? raw.closedAt
          : new Date(raw.closedAt).toISOString(),
  };
}

function normalizeMovement(raw: any): CashMovement {
  return {
    id: Number(raw?.id ?? Date.now()),
    shiftId:
      raw?.shiftId === null || raw?.shiftId === undefined
        ? null
        : Number(raw.shiftId),
    type: raw?.type === "OUT" ? "OUT" : "IN",
    amount: Number(raw?.amount ?? 0),
    note: String(raw?.note ?? ""),
    createdAt:
      typeof raw?.createdAt === "string"
        ? raw.createdAt
        : new Date(raw?.createdAt ?? Date.now()).toISOString(),
  };
}

function normalizeSnapshot(raw: any): DashboardSnapshot {
  const currentShiftSummary = raw?.currentShiftSummary
    ? {
        shift: normalizeShift(raw.currentShiftSummary.shift),
        openingCash: Number(raw.currentShiftSummary.openingCash ?? 0),
        cashIn: Number(raw.currentShiftSummary.cashIn ?? 0),
        cashOut: Number(raw.currentShiftSummary.cashOut ?? 0),
        expectedCash: Number(raw.currentShiftSummary.expectedCash ?? 0),
        actualCash: Number(raw.currentShiftSummary.actualCash ?? 0),
        difference: Number(raw.currentShiftSummary.difference ?? 0),
        movements: Array.isArray(raw.currentShiftSummary.movements)
          ? raw.currentShiftSummary.movements.map((item: any) =>
              normalizeMovement(item)
            )
          : [],
      }
    : null;

  return {
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
    currentShiftSummary,
    recentSales: Array.isArray(raw?.recentSales)
      ? raw.recentSales.map((item: any) => ({
          id: Number(item?.id ?? Date.now()),
          invoiceNumber: String(item?.invoiceNumber ?? ""),
          saleDate:
            typeof item?.saleDate === "string"
              ? item.saleDate
              : new Date(item?.saleDate ?? Date.now()).toISOString(),
          cashier: String(item?.cashier ?? ""),
          shiftId: Number(item?.shiftId ?? 0),
          paymentMethod: item?.paymentMethod === "card" ? "card" : "cash",
          total: Number(item?.total ?? 0),
          profit: Number(item?.profit ?? 0),
          itemsCount: Number(item?.itemsCount ?? 0),
        }))
      : [],
    lowStockProducts: Array.isArray(raw?.lowStockProducts)
      ? raw.lowStockProducts.map((item: any) => ({
          id: Number(item?.id ?? Date.now()),
          sku: String(item?.sku ?? ""),
          barcode: String(item?.barcode ?? ""),
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
          stock: Number(item?.stock ?? 0),
          isActive: Boolean(item?.isActive ?? true),
          quantitySold: Number(item?.quantitySold ?? 0),
          revenue: Number(item?.revenue ?? 0),
          cost: Number(item?.cost ?? 0),
          profit: Number(item?.profit ?? 0),
        }))
      : [],
  };
}

function readCache(): DashboardSnapshot | null {
  const raw = localStorage.getItem(DASHBOARD_CACHE_KEY);

  if (!raw) return null;

  try {
    return normalizeSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeCache(snapshot: DashboardSnapshot) {
  localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(snapshot));
}

export function getDashboardSnapshot(): DashboardSnapshot | null {
  return readCache();
}

export async function syncDashboardCache() {
  const response = await apiFetch("/dashboard/overview");

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { snapshot?: unknown };

  const snapshot = normalizeSnapshot(payload.snapshot ?? payload);
  writeCache(snapshot);

  return snapshot;
}