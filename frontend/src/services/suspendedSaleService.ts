import { apiFetch, readApiError } from "./api";

export type SuspendedSaleItem = {
  productId: number;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  lineTotal: number;
  costTotal: number;
};

export type SuspendedSale = {
  id: number;
  reference: string;
  createdAt: string;
  cashier: string;
  reason: string;
  paymentMethod: "cash" | "card";
  discountPercent: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  costTotal: number;
  items: SuspendedSaleItem[];
};

export type SuspendedSaleDraft = {
  sourceId: number;
  sale: SuspendedSale;
};

const SUSPENDED_SALES_CACHE_KEY = "suspended_sales_cache";
const SUSPENDED_SALE_DRAFT_KEY = "suspended_sale_draft";

function normalizeItem(raw: any): SuspendedSaleItem {
  return {
    productId: Number(raw?.productId ?? 0),
    sku: String(raw?.sku ?? "").trim(),
    name: String(raw?.name ?? "").trim(),
    quantity: Number(raw?.quantity ?? 0),
    unitPrice: Number(raw?.unitPrice ?? 0),
    costPrice: Number(raw?.costPrice ?? 0),
    lineTotal: Number(raw?.lineTotal ?? 0),
    costTotal: Number(raw?.costTotal ?? 0),
  };
}

function normalizeSuspendedSale(raw: any): SuspendedSale {
  const items = Array.isArray(raw?.items)
    ? raw.items.map((item: any) => normalizeItem(item))
    : [];

  const subtotal = Number(
    raw?.subtotal ??
      items.reduce((sum: number, item: SuspendedSaleItem) => sum + item.lineTotal, 0)
  );

  const discountPercent = Number(raw?.discountPercent ?? 0);
  const discountAmount = Number(
    raw?.discountAmount ?? Math.round((subtotal * discountPercent) / 100)
  );

  const costTotal = Number(
    raw?.costTotal ??
      items.reduce((sum: number, item: SuspendedSaleItem) => sum + item.costTotal, 0)
  );

  const total = Number(raw?.total ?? Math.max(0, subtotal - discountAmount));

  return {
    id: Number(raw?.id ?? Date.now()),
    reference: String(raw?.reference ?? `HOLD-${Date.now().toString().slice(-6)}`),
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
    cashier: String(raw?.cashier ?? "Cashier"),
    reason: String(raw?.reason ?? "Held sale"),
    paymentMethod: raw?.paymentMethod === "card" ? "card" : "cash",
    discountPercent,
    subtotal,
    discountAmount,
    total,
    costTotal,
    items,
  };
}

function readCache(): SuspendedSale[] {
  const raw = localStorage.getItem(SUSPENDED_SALES_CACHE_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeSuspendedSale(item));
  } catch {
    return [];
  }
}

function writeCache(sales: SuspendedSale[]) {
  localStorage.setItem(SUSPENDED_SALES_CACHE_KEY, JSON.stringify(sales));
}

function upsertCache(sale: SuspendedSale) {
  const current = readCache();
  const index = current.findIndex((item) => item.id === sale.id);

  if (index === -1) {
    current.unshift(sale);
  } else {
    current[index] = sale;
  }

  writeCache(current);
}

function removeFromCache(id: number) {
  writeCache(readCache().filter((sale) => sale.id !== id));
}

export function getSuspendedSales(): SuspendedSale[] {
  return readCache();
}

export function getSuspendedSaleById(id: number): SuspendedSale | null {
  return readCache().find((sale) => sale.id === id) ?? null;
}

export async function syncSuspendedSalesCache() {
  try {
    const response = await apiFetch("/suspended-sales");

    if (!response.ok) {
      throw new Error(await readApiError(response));
    }

    const payload = (await response.json()) as { suspendedSales?: unknown };
    const suspendedSales = Array.isArray(payload.suspendedSales)
      ? payload.suspendedSales.map((item) => normalizeSuspendedSale(item))
      : [];

    writeCache(suspendedSales);
    return suspendedSales;
  } catch {
    return readCache();
  }
}

type SuspendSaleInput = {
  cashier: string;
  reason?: string;
  paymentMethod: "cash" | "card";
  discountPercent: number;
  items: SuspendedSaleItem[];
};

export async function suspendSale(input: SuspendSaleInput) {
  const items = input.items.map(normalizeItem);

  const localSale: SuspendedSale = {
    id: Date.now(),
    reference: `HOLD-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
    cashier: input.cashier.trim() || "Cashier",
    reason: input.reason?.trim() || "Held sale",
    paymentMethod: input.paymentMethod,
    discountPercent: Number(input.discountPercent ?? 0),
    subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
    discountAmount: Math.round(
      (items.reduce((sum, item) => sum + item.lineTotal, 0) *
        Number(input.discountPercent ?? 0)) /
        100
    ),
    total: 0,
    costTotal: items.reduce((sum, item) => sum + item.costTotal, 0),
    items,
  };

  localSale.total = Math.max(0, localSale.subtotal - localSale.discountAmount);

  try {
    const response = await apiFetch("/suspended-sales", {
      method: "POST",
      body: JSON.stringify({
        cashier: input.cashier,
        reason: input.reason,
        paymentMethod: input.paymentMethod,
        discountPercent: input.discountPercent,
        items,
      }),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response));
    }

    const payload = (await response.json()) as { suspendedSale?: unknown };
    const saved = normalizeSuspendedSale(payload.suspendedSale);

    upsertCache(saved);
    return saved;
  } catch {
    upsertCache(localSale);
    return localSale;
  }
}

export async function deleteSuspendedSale(id: number) {
  try {
    const response = await apiFetch(`/suspended-sales/${id}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(await readApiError(response));
    }
  } catch {
    // fallback below
  }

  removeFromCache(id);
}

export async function clearSuspendedSales() {
  try {
    const response = await apiFetch("/suspended-sales", {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(await readApiError(response));
    }
  } catch {
    // fallback below
  }

  writeCache([]);
}

export function queueRestoreSuspendedSale(sale: SuspendedSale) {
  const draft: SuspendedSaleDraft = {
    sourceId: sale.id,
    sale,
  };

  localStorage.setItem(SUSPENDED_SALE_DRAFT_KEY, JSON.stringify(draft));
}

export function consumeRestoreSuspendedSale(): SuspendedSaleDraft | null {
  const raw = localStorage.getItem(SUSPENDED_SALE_DRAFT_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SuspendedSaleDraft> | null;

    if (!parsed?.sale) {
      localStorage.removeItem(SUSPENDED_SALE_DRAFT_KEY);
      return null;
    }

    const draft: SuspendedSaleDraft = {
      sourceId: Number(parsed.sourceId ?? parsed.sale.id),
      sale: normalizeSuspendedSale(parsed.sale),
    };

    localStorage.removeItem(SUSPENDED_SALE_DRAFT_KEY);
    return draft;
  } catch {
    localStorage.removeItem(SUSPENDED_SALE_DRAFT_KEY);
    return null;
  }
}