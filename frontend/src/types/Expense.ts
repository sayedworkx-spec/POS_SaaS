export type ExpensePaymentMethod = "cash" | "card";

export interface Expense {
  id: number;
  expenseNumber: string;
  expenseDate: string;
  title: string;
  category: string;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  notes: string;
  createdBy: string;
}