import { apiFetch, readApiError } from "./api";
import type {
  CashMovement,
  CashMovementType,
  CashRegisterSummary,
  CashShift,
} from "../types/CashRegister";

const CURRENT_SHIFT_KEY = "cash_register_current_shift";
const SHIFT_LIST_KEY = "cash_register_shift_list";
const SUMMARY_MAP_KEY = "cash_register_summary_map";

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

function normalizeSummary(raw: any): CashRegisterSummary {
  const shift = normalizeShift(raw?.shift ?? raw);

  const movements = Array.isArray(raw?.movements)
    ? raw.movements.map((item: any) => normalizeMovement(item))
    : [];

  return {
    shift,
    openingCash: Number(raw?.openingCash ?? shift.openingCash),
    cashIn: Number(raw?.cashIn ?? 0),
    cashOut: Number(raw?.cashOut ?? 0),
    expectedCash: Number(raw?.expectedCash ?? shift.openingCash),
    actualCash: Number(raw?.actualCash ?? shift.openingCash),
    difference: Number(raw?.difference ?? 0),
    movements,
  };
}

function readJSON<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);

  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readSummaryMap(): Record<string, CashRegisterSummary> {
  return readJSON<Record<string, CashRegisterSummary>>(SUMMARY_MAP_KEY, {});
}

function writeSummaryMap(value: Record<string, CashRegisterSummary>) {
  writeJSON(SUMMARY_MAP_KEY, value);
}

function cacheShiftList(shifts: CashShift[]) {
  writeJSON(SHIFT_LIST_KEY, shifts);
}

function cacheCurrentShift(shift: CashShift | null) {
  if (!shift) {
    localStorage.removeItem(CURRENT_SHIFT_KEY);
    return;
  }

  writeJSON(CURRENT_SHIFT_KEY, shift);
}

function upsertSummary(summary: CashRegisterSummary) {
  const map = readSummaryMap();
  map[String(summary.shift.id)] = summary;
  writeSummaryMap(map);
}

function upsertShiftListItem(shift: CashShift) {
  const current = getCashShifts();
  const index = current.findIndex((item) => item.id === shift.id);

  if (index === -1) {
    current.unshift(shift);
  } else {
    current[index] = shift;
  }

  cacheShiftList(current);
}

export function getCurrentShift(): CashShift | null {
  const raw = localStorage.getItem(CURRENT_SHIFT_KEY);

  if (!raw) return null;

  try {
    return normalizeShift(JSON.parse(raw));
  } catch {
    localStorage.removeItem(CURRENT_SHIFT_KEY);
    return null;
  }
}

export function getCashShifts(): CashShift[] {
  const raw = localStorage.getItem(SHIFT_LIST_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeShift(item));
  } catch {
    return [];
  }
}

export function getShiftSummary(shiftId: number): CashRegisterSummary | null {
  const map = readSummaryMap();
  const summary = map[String(shiftId)];

  return summary ? normalizeSummary(summary) : null;
}

export async function syncCashRegisterCache() {
  const [currentResponse, shiftsResponse] = await Promise.all([
    apiFetch("/cash-register/current"),
    apiFetch("/cash-register/shifts"),
  ]);

  if (!currentResponse.ok) {
    throw new Error(await readApiError(currentResponse));
  }

  if (!shiftsResponse.ok) {
    throw new Error(await readApiError(shiftsResponse));
  }

  const currentPayload = (await currentResponse.json()) as { shift?: unknown };
  const shiftsPayload = (await shiftsResponse.json()) as { shifts?: unknown };

  const currentShift = currentPayload.shift ? normalizeShift(currentPayload.shift) : null;
  const shifts = Array.isArray(shiftsPayload.shifts)
    ? shiftsPayload.shifts.map((item) => normalizeShift(item))
    : [];

  cacheCurrentShift(currentShift);
  cacheShiftList(shifts);

  if (currentShift) {
    const summaryResponse = await apiFetch(
      `/cash-register/summary?shiftId=${currentShift.id}`
    );

    if (summaryResponse.ok) {
      const summaryPayload = (await summaryResponse.json()) as { summary?: unknown };
      if (summaryPayload.summary) {
        const summary = normalizeSummary(summaryPayload.summary);
        upsertSummary(summary);
      }
    }
  }

  return { currentShift, shifts, summary: currentShift ? getShiftSummary(currentShift.id) : null };
}

export async function openCashShift(openingCash: number) {
  const response = await apiFetch("/cash-register/open", {
    method: "POST",
    body: JSON.stringify({ openingCash }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { shift?: unknown; summary?: unknown };

  await syncCashRegisterCache();

  return {
    shift: payload.shift ? normalizeShift(payload.shift) : null,
    summary: payload.summary ? normalizeSummary(payload.summary) : null,
  };
}

export async function addCashMovement(
  type: CashMovementType,
  amount: number,
  note: string,
  shiftId?: number
) {
  const response = await apiFetch("/cash-register/movements", {
    method: "POST",
    body: JSON.stringify({
      type,
      amount,
      note,
      shiftId,
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { movement?: unknown; summary?: unknown };

  await syncCashRegisterCache();

  return {
    movement: payload.movement ? normalizeMovement(payload.movement) : null,
    summary: payload.summary ? normalizeSummary(payload.summary) : null,
  };
}

export async function closeCashShift(shiftId: number, actualCash: number) {
  const response = await apiFetch(`/cash-register/${shiftId}/close`, {
    method: "POST",
    body: JSON.stringify({ actualCash }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { shift?: unknown; summary?: unknown };

  await syncCashRegisterCache();

  return {
    shift: payload.shift ? normalizeShift(payload.shift) : null,
    summary: payload.summary ? normalizeSummary(payload.summary) : null,
  };
}