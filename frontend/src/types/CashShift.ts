export interface CashShift {
  id: number;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
  openedBy: string;
  closedBy: string | null;
  status: "open" | "closed";
}