import type { Expense } from "../types/Expense";
import { addCashMovement, getCurrentShift } from "./cashRegisterService";

const EXPENSES_KEY = "expenses";

const defaultExpenses: Expense[] = [];

function readExpenses(): Expense[] {
  const raw = localStorage.getItem(EXPENSES_KEY);

  if (!raw) {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(defaultExpenses));
    return defaultExpenses;
  }

  try {
    const parsed = JSON.parse(raw) as any[];

    if (!Array.isArray(parsed)) {
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(defaultExpenses));
      return defaultExpenses;
    }

    const normalized: Expense[] = parsed.map((item) => ({
      id: Number(item?.id ?? Date.now()),
      expenseNumber: String(item?.expenseNumber ?? `EXP-${Date.now()}`),
      expenseDate: String(item?.expenseDate ?? new Date().toISOString()),
      title: String(item?.title ?? "").trim(),
      category: String(item?.category ?? "General").trim(),
      amount: Number(item?.amount ?? 0),
      paymentMethod: item?.paymentMethod === "card" ? "card" : "cash",
      notes: String(item?.notes ?? "").trim(),
      createdBy: String(item?.createdBy ?? "Admin").trim(),
    }));

    localStorage.setItem(EXPENSES_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(defaultExpenses));
    return defaultExpenses;
  }
}

function writeExpenses(expenses: Expense[]) {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function getExpenses(): Expense[] {
  return readExpenses();
}

export function addExpense(input: Omit<Expense, "id" | "expenseNumber">) {
  if (!input.title.trim()) {
    throw new Error("Expense title is required");
  }

  if (!input.category.trim()) {
    throw new Error("Expense category is required");
  }

  if (input.amount <= 0) {
    throw new Error("Expense amount must be greater than zero");
  }

  if (input.paymentMethod === "cash") {
    const currentShift = getCurrentShift();

    if (!currentShift) {
      throw new Error("Open a cash shift before recording a cash expense");
    }

    addCashMovement("OUT", input.amount, `Expense: ${input.title}`);
  }

  const expenses = readExpenses();

  const newExpense: Expense = {
    id: Date.now(),
    expenseNumber: `EXP-${Date.now().toString().slice(-6)}`,
    ...input,
    title: input.title.trim(),
    category: input.category.trim(),
    notes: input.notes.trim(),
    createdBy: input.createdBy.trim(),
  };

  expenses.push(newExpense);
  writeExpenses(expenses);

  return newExpense;
}

export function deleteExpense(expenseId: number) {
  const expenses = readExpenses();
  const filtered = expenses.filter((expense) => expense.id !== expenseId);
  writeExpenses(filtered);
}