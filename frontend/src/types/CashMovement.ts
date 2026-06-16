export interface CashMovement {
  id: number;
  shiftId: number;
  type: "IN" | "OUT";
  amount: number;
  reason: string;
  createdAt: string;
}