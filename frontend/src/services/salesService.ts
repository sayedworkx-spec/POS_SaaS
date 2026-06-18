import { apiFetch, readApiError } from "./api";
import type { Sale } from "../types/Sale";

const SALES_CACHE_KEY = "sales";

type SaleItem = Sale["items"][number];
type SalePayload = Omit<Sale, "id">;

function normalizeSale(raw: any): Sale {
  const items = Array.isArray(raw?.items)
    ? raw.items.map((item: any) => ({
        productId: Number(item?.productId ?? 0),
        sku: String(item?.sku ?? "").trim(),
        name: String(item?.name ?? "").trim(),
        quantity: Number(item?.quantity ?? 0),
        unitPrice: Number(item?.unitPrice ?? 0),
        costPrice: Number(item?.costPrice ?? 0),
        lineTotal: Number(item?.lineTotal ?? 0),
        costTotal: Number(item?.costTotal ?? 0),
      }))
    : [];

  return {
    id: Number(raw?.id ?? Date.now()),
    invoiceNumber: String(raw?.invoiceNumber ?? `INV-${Date.now()}`),
    saleDate: String(raw?.saleDate ?? new Date().toISOString()),
    cashier: String(raw?.cashier ?? "Cashier"),
    shiftId: Number(raw?.shiftId ?? 0),
    paymentMethod: raw?.paymentMethod === "card" ? "card" : "cash",
    subtotal: Number(raw?.subtotal ?? 0),
    costTotal: Number(raw?.costTotal ?? 0),
    profit: Number(raw?.profit ?? 0),
    discountPercent: Number(raw?.discountPercent ?? 0),
    discountAmount: Number(raw?.discountAmount ?? 0),
    total: Number(raw?.total ?? 0),
    cashReceived: Number(raw?.cashReceived ?? 0),
    change: Number(raw?.change ?? 0),
    items,
  };
}

function readCache(): Sale[] {
  const raw = localStorage.getItem(SALES_CACHE_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeSale(item));
  } catch {
    return [];
  }
}

function writeCache(sales: Sale[]) {
  localStorage.setItem(SALES_CACHE_KEY, JSON.stringify(sales));
}

function upsertCache(sale: Sale) {
  const current = readCache();
  const index = current.findIndex((item) => item.id === sale.id);

  if (index === -1) {
    current.unshift(sale);
  } else {
    current[index] = sale;
  }

  writeCache(current);
}

export function getSales(): Sale[] {
  return readCache();
}

export function getSaleByInvoiceNumber(invoiceNumber: string): Sale | null {
  return readCache().find((sale) => sale.invoiceNumber === invoiceNumber) ?? null;
}

export async function syncSalesCache() {
  const response = await apiFetch("/sales");

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { sales?: unknown };

  const sales = Array.isArray(payload.sales)
    ? payload.sales.map((item) => normalizeSale(item))
    : [];

  writeCache(sales);
  return sales;
}

export const fetchSales = syncSalesCache;

export async function fetchSaleByInvoiceNumber(invoiceNumber: string) {
  const response = await apiFetch(`/sales/${encodeURIComponent(invoiceNumber)}`);

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { sale?: unknown };
  const sale = normalizeSale(payload.sale);

  upsertCache(sale);
  return sale;
}

export async function addSale(sale: SalePayload) {
  const response = await apiFetch("/sales", {
    method: "POST",
    body: JSON.stringify(sale),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { sale?: unknown };
  const saved = normalizeSale(payload.sale);

  upsertCache(saved);
  return saved;
}