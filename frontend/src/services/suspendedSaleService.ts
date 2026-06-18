import type {
  SuspendedSale,
  SuspendedSaleDraft,
  SuspendedSaleItem,
} from "../types/SuspendedSale";

const SUSPENDED_SALES_KEY = "suspended_sales";
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
    ? raw.items.map(normalizeItem)
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

function readSuspendedSales(): SuspendedSale[] {
  const raw = localStorage.getItem(SUSPENDED_SALES_KEY);

  if (!raw) {
    localStorage.setItem(SUSPENDED_SALES_KEY, JSON.stringify([]));
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      localStorage.setItem(SUSPENDED_SALES_KEY, JSON.stringify([]));
      return [];
    }

    const normalized = parsed.map((item) =>
      normalizeSuspendedSale(item as Record<string, unknown>)
    );

    localStorage.setItem(SUSPENDED_SALES_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    localStorage.setItem(SUSPENDED_SALES_KEY, JSON.stringify([]));
    return [];
  }
}

function writeSuspendedSales(sales: SuspendedSale[]) {
  localStorage.setItem(SUSPENDED_SALES_KEY, JSON.stringify(sales));
}

export function getSuspendedSales(): SuspendedSale[] {
  return readSuspendedSales();
}

export function getSuspendedSaleById(id: number): SuspendedSale | null {
  return readSuspendedSales().find((sale) => sale.id === id) ?? null;
}

type SuspendSaleInput = {
  cashier: string;
  reason?: string;
  paymentMethod: "cash" | "card";
  discountPercent: number;
  items: SuspendedSaleItem[];
};

export function suspendSale(input: SuspendSaleInput) {
  const items = input.items.map(normalizeItem);

  const subtotal = items.reduce(
    (sum: number, item: SuspendedSaleItem) => sum + item.lineTotal,
    0
  );

  const discountPercent = Number(input.discountPercent ?? 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);

  const costTotal = items.reduce(
    (sum: number, item: SuspendedSaleItem) => sum + item.costTotal,
    0
  );

  const total = Math.max(0, subtotal - discountAmount);

  const suspendedSale: SuspendedSale = {
    id: Date.now(),
    reference: `HOLD-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
    cashier: input.cashier.trim() || "Cashier",
    reason: input.reason?.trim() || "Held sale",
    paymentMethod: input.paymentMethod,
    discountPercent,
    subtotal,
    discountAmount,
    total,
    costTotal,
    items,
  };

  const current = readSuspendedSales();
  current.unshift(suspendedSale);
  writeSuspendedSales(current);

  return suspendedSale;
}

export function deleteSuspendedSale(id: number) {
  const current = readSuspendedSales();
  const next = current.filter((sale) => sale.id !== id);
  writeSuspendedSales(next);
}

export function clearSuspendedSales() {
  writeSuspendedSales([]);
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