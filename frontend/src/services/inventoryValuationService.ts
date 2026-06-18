import { apiFetch, readApiError } from "./api";
import type { InventoryValuationSnapshot } from "../types/InventoryValuation";

const INVENTORY_VALUATION_CACHE_KEY = "inventory_valuation_snapshot";

function normalizeRow(raw: any) {
  return {
    id: Number(raw?.id ?? 0),
    sku: String(raw?.sku ?? ""),
    barcode: String(raw?.barcode ?? ""),
    name: String(raw?.name ?? ""),
    stock: Number(raw?.stock ?? 0),
    costPrice: Number(raw?.costPrice ?? 0),
    sellPrice: Number(raw?.sellPrice ?? 0),
    reorderLevel: Number(raw?.reorderLevel ?? 0),
    isActive: Boolean(raw?.isActive ?? true),
    lineValue: Number(raw?.lineValue ?? 0),
    stockValue: Number(raw?.stockValue ?? 0),
    sellValue: Number(raw?.sellValue ?? 0),
    potentialGrossMargin: Number(raw?.potentialGrossMargin ?? 0),
    status:
      raw?.status === "low_stock"
        ? "low_stock"
        : raw?.status === "out_of_stock"
          ? "out_of_stock"
          : "ok",
  } as const;
}

function normalizeSnapshot(raw: any): InventoryValuationSnapshot {
  return {
    summary: {
      totalProducts: Number(raw?.summary?.totalProducts ?? 0),
      activeProducts: Number(raw?.summary?.activeProducts ?? 0),
      inactiveProducts: Number(raw?.summary?.inactiveProducts ?? 0),
      lowStockProducts: Number(raw?.summary?.lowStockProducts ?? 0),
      zeroStockProducts: Number(raw?.summary?.zeroStockProducts ?? 0),
      totalQty: Number(raw?.summary?.totalQty ?? 0),
      totalInventoryValue: Number(raw?.summary?.totalInventoryValue ?? 0),
      totalSellValue: Number(raw?.summary?.totalSellValue ?? 0),
      totalPotentialMargin: Number(raw?.summary?.totalPotentialMargin ?? 0),
      averageUnitCost: Number(raw?.summary?.averageUnitCost ?? 0),
      averageUnitSell: Number(raw?.summary?.averageUnitSell ?? 0),
    },
    rows: Array.isArray(raw?.rows) ? raw.rows.map(normalizeRow) : [],
    topValueProducts: Array.isArray(raw?.topValueProducts)
      ? raw.topValueProducts.map(normalizeRow)
      : [],
    topQtyProducts: Array.isArray(raw?.topQtyProducts)
      ? raw.topQtyProducts.map(normalizeRow)
      : [],
    lowStockProducts: Array.isArray(raw?.lowStockProducts)
      ? raw.lowStockProducts.map(normalizeRow)
      : [],
    zeroStockProducts: Array.isArray(raw?.zeroStockProducts)
      ? raw.zeroStockProducts.map(normalizeRow)
      : [],
  };
}

function readCache(): InventoryValuationSnapshot | null {
  const raw = localStorage.getItem(INVENTORY_VALUATION_CACHE_KEY);

  if (!raw) return null;

  try {
    return normalizeSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeCache(snapshot: InventoryValuationSnapshot) {
  localStorage.setItem(INVENTORY_VALUATION_CACHE_KEY, JSON.stringify(snapshot));
}

export function getInventoryValuationSnapshot(): InventoryValuationSnapshot | null {
  return readCache();
}

export async function syncInventoryValuationCache() {
  const response = await apiFetch("/inventory-valuation/overview");

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { snapshot?: unknown };
  const snapshot = normalizeSnapshot(payload.snapshot ?? payload);

  writeCache(snapshot);
  return snapshot;
}
