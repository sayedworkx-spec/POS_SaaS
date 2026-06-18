export type CashMovementType = "IN" | "OUT";
export type CashShiftStatus = "open" | "closed";

export interface CashShift {
  id: number;
  userId: number | null;
  userName: string;
  openingCash: number;
  closingCash: number | null;
  actualCash: number | null;
  difference: number | null;
  status: CashShiftStatus;
  openedAt: string;
  closedAt: string | null;
}

export interface CashMovement {
  id: number;
  shiftId: number | null;
  type: CashMovementType;
  amount: number;
  note: string;
  createdAt: string;
}

export interface CashRegisterSummary {
  shift: CashShift;
  openingCash: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  movements: CashMovement[];
}