import type { CashMovement } from "../types/CashMovement";
import type { CashShift } from "../types/CashShift";

const SHIFTS_KEY = "cash_shifts";
const MOVEMENTS_KEY = "cash_movements";

export type CashShiftSummary = {
  shift: CashShift;
  movements: CashMovement[];
  cashInTotal: number;
  cashOutTotal: number;
  expectedCash: number;
  difference: number | null;
};

function readArray<T>(key: string): T[] {
  const raw = localStorage.getItem(key);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getCashShifts(): CashShift[] {
  return readArray<CashShift>(SHIFTS_KEY);
}

export function getCashMovements(): CashMovement[] {
  return readArray<CashMovement>(MOVEMENTS_KEY);
}

export function getCurrentShift(): CashShift | null {
  const shifts = getCashShifts();
  return shifts.find((shift) => shift.status === "open") ?? null;
}

export function getShiftSummary(
  shiftId?: number
): CashShiftSummary | null {
  const shift =
    typeof shiftId === "number"
      ? getCashShifts().find((item) => item.id === shiftId) ?? null
      : getCurrentShift();

  if (!shift) {
    return null;
  }

  const movements = getCashMovements().filter(
    (movement) => movement.shiftId === shift.id
  );

  const cashInTotal = movements
    .filter((movement) => movement.type === "IN")
    .reduce((sum, movement) => sum + movement.amount, 0);

  const cashOutTotal = movements
    .filter((movement) => movement.type === "OUT")
    .reduce((sum, movement) => sum + movement.amount, 0);

  const expectedCash =
    shift.openingCash + cashInTotal - cashOutTotal;

  const difference =
    shift.status === "closed" && shift.closingCash !== null
      ? shift.closingCash - expectedCash
      : null;

  return {
    shift,
    movements,
    cashInTotal,
    cashOutTotal,
    expectedCash,
    difference,
  };
}

export function openShift(
  openingCash: number,
  openedBy = "Cashier"
) {
  const existingShift = getCurrentShift();

  if (existingShift) {
    throw new Error("A shift is already open");
  }

  const shifts = getCashShifts();

  const newShift: CashShift = {
    id: Date.now(),
    openedAt: new Date().toISOString(),
    closedAt: null,
    openingCash: Number.isFinite(openingCash) ? openingCash : 0,
    closingCash: null,
    openedBy,
    closedBy: null,
    status: "open",
  };

  shifts.push(newShift);
  writeArray(SHIFTS_KEY, shifts);

  return newShift;
}

export function addCashMovement(
  type: "IN" | "OUT",
  amount: number,
  reason: string
) {
  const shift = getCurrentShift();

  if (!shift) {
    throw new Error("No open shift");
  }

  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const movements = getCashMovements();

  const newMovement: CashMovement = {
    id: Date.now(),
    shiftId: shift.id,
    type,
    amount,
    reason: reason.trim() || "Manual movement",
    createdAt: new Date().toISOString(),
  };

  movements.push(newMovement);
  writeArray(MOVEMENTS_KEY, movements);

  return newMovement;
}

export function closeShift(
  actualCash: number,
  closedBy = "Cashier"
) {
  const shift = getCurrentShift();

  if (!shift) {
    throw new Error("No open shift");
  }

  const summary = getShiftSummary(shift.id);

  if (!summary) {
    throw new Error("Unable to calculate shift summary");
  }

  const safeActualCash = Number.isFinite(actualCash) ? actualCash : 0;
  const difference = safeActualCash - summary.expectedCash;

  const shifts = getCashShifts();

  const updatedShifts = shifts.map((item) =>
    item.id === shift.id
      ? {
          ...item,
          status: "closed",
          closedAt: new Date().toISOString(),
          closingCash: safeActualCash,
          closedBy,
        }
      : item
  );

  writeArray(SHIFTS_KEY, updatedShifts);

  return {
    shift: updatedShifts.find((item) => item.id === shift.id)!,
    summary,
    difference,
  };
}