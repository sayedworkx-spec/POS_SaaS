import { apiFetch, readApiError } from "./api";
import type { Purchase } from "../types/Purchase";
import { syncProductsCache } from "./productService";

const PURCHASES_CACHE_KEY = "purchases_cache";

function normalizePurchase(raw: any): Purchase {
  return {
    id: Number(raw?.id ?? Date.now()),
    productId: Number(raw?.productId ?? 0),
    quantity: Number(raw?.quantity ?? 0),
    unitCost: Number(raw?.unitCost ?? 0),
    purchaseDate: String(raw?.purchaseDate ?? new Date().toISOString()),
  };
}

function readCache(): Purchase[] {
  const raw = localStorage.getItem(PURCHASES_CACHE_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizePurchase(item));
  } catch {
    return [];
  }
}

function writeCache(purchases: Purchase[]) {
  localStorage.setItem(PURCHASES_CACHE_KEY, JSON.stringify(purchases));
}

function upsertCache(purchase: Purchase) {
  const current = readCache();
  const index = current.findIndex((item) => item.id === purchase.id);

  if (index === -1) {
    current.unshift(purchase);
  } else {
    current[index] = purchase;
  }

  writeCache(current);
}

export function getPurchases(): Purchase[] {
  return readCache();
}

export async function syncPurchasesCache() {
  const response = await apiFetch("/purchases");

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { purchases?: unknown };
  const purchases = Array.isArray(payload.purchases)
    ? payload.purchases.map((item) => normalizePurchase(item))
    : [];

  writeCache(purchases);
  return purchases;
}

export async function addPurchase(purchase: Omit<Purchase, "id">) {
  const response = await apiFetch("/purchases", {
    method: "POST",
    body: JSON.stringify(purchase),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { purchase?: unknown };
  const saved = normalizePurchase(payload.purchase);

  upsertCache(saved);

  await syncProductsCache().catch(() => undefined);

  return saved;
}