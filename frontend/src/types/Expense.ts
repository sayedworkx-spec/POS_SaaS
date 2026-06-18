export interface Expense {
  id: number;
  expenseNumber: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: "cash" | "card";
  shiftId: number | null;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}