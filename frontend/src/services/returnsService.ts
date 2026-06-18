import { apiFetch, readApiError } from "./api";
import type { SalesReturn } from "../types/Return";

const RETURNS_CACHE_KEY = "sales_returns";

type ReturnPayload = Omit<SalesReturn, "id">;

function normalizeReturn(raw: any): SalesReturn {
  const items = Array.isArray(raw?.items)
    ? raw.items.map((item: any) => ({
        id: Number(item?.id ?? Date.now()),
        returnId: Number(item?.returnId ?? 0),
        productId: Number(item?.productId ?? 0),
        sku: String(item?.sku ?? "").trim(),
        name: String(item?.name ?? "").trim(),
        quantity: Number(item?.quantity ?? 0),
        unitPrice: Number(item?.unitPrice ?? 0),
        refundTotal: Number(item?.refundTotal ?? 0),
      }))
    : [];

  return {
    id: Number(raw?.id ?? Date.now()),
    returnNumber: String(raw?.returnNumber ?? `RET-${Date.now()}`),
    returnDate: String(raw?.returnDate ?? new Date().toISOString()),
    saleId: Number(raw?.saleId ?? 0),
    invoiceNumber: String(raw?.invoiceNumber ?? ""),
    cashier: String(raw?.cashier ?? "Cashier"),
    reason: String(raw?.reason ?? ""),
    refundMethod: raw?.refundMethod === "card" ? "card" : "cash",
    shiftId:
      raw?.shiftId === null || raw?.shiftId === undefined
        ? null
        : Number(raw.shiftId),
    subtotal: Number(raw?.subtotal ?? 0),
    refundAmount: Number(raw?.refundAmount ?? 0),
    items,
    createdAt: raw?.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

function readCache(): SalesReturn[] {
  const raw = localStorage.getItem(RETURNS_CACHE_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeReturn(item));
  } catch {
    return [];
  }
}

function writeCache(returnsList: SalesReturn[]) {
  localStorage.setItem(RETURNS_CACHE_KEY, JSON.stringify(returnsList));
}

function upsertCache(ret: SalesReturn) {
  const current = readCache();
  const index = current.findIndex((item) => item.id === ret.id);

  if (index === -1) {
    current.unshift(ret);
  } else {
    current[index] = ret;
  }

  writeCache(current);
}

export function getReturns(): SalesReturn[] {
  return readCache();
}

export function getReturnByNumber(returnNumber: string): SalesReturn | null {
  return readCache().find((item) => item.returnNumber === returnNumber) ?? null;
}

export function getReturnsBySaleId(saleId: number): SalesReturn[] {
  return readCache().filter((item) => item.saleId === saleId);
}

export async function syncReturnsCache() {
  const response = await apiFetch("/returns");

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { returns?: unknown };

  const returnsList = Array.isArray(payload.returns)
    ? payload.returns.map((item) => normalizeReturn(item))
    : [];

  writeCache(returnsList);
  return returnsList;
}

export async function fetchReturnByNumber(returnNumber: string) {
  const response = await apiFetch(`/returns/${encodeURIComponent(returnNumber)}`);

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { salesReturn?: unknown };
  const ret = normalizeReturn(payload.salesReturn);

  upsertCache(ret);
  return ret;
}

export async function createReturn(payload: ReturnPayload) {
  const response = await apiFetch("/returns", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const data = (await response.json()) as { salesReturn?: unknown };
  const saved = normalizeReturn(data.salesReturn);

  upsertCache(saved);
  return saved;
}