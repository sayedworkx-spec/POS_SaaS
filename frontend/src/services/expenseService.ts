import { apiFetch, readApiError } from "./api";
import type { Expense } from "../types/Expense";

const EXPENSES_CACHE_KEY = "expenses_cache";

type ExpensePayload = Omit<Expense, "id">;

function normalizeExpense(raw: any): Expense {
  return {
    id: Number(raw?.id ?? Date.now()),
    expenseNumber: String(raw?.expenseNumber ?? `EXP-${Date.now()}`),
    expenseDate: String(raw?.expenseDate ?? new Date().toISOString()),
    category: String(raw?.category ?? ""),
    description: String(raw?.description ?? ""),
    amount: Number(raw?.amount ?? 0),
    paymentMethod: raw?.paymentMethod === "card" ? "card" : "cash",
    shiftId:
      raw?.shiftId === null || raw?.shiftId === undefined
        ? null
        : Number(raw.shiftId),
    createdBy: String(raw?.createdBy ?? "System"),
    createdAt: raw?.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

function readCache(): Expense[] {
  const raw = localStorage.getItem(EXPENSES_CACHE_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeExpense(item));
  } catch {
    return [];
  }
}

function writeCache(expenses: Expense[]) {
  localStorage.setItem(EXPENSES_CACHE_KEY, JSON.stringify(expenses));
}

function upsertCache(expense: Expense) {
  const current = readCache();
  const index = current.findIndex((item) => item.id === expense.id);

  if (index === -1) {
    current.unshift(expense);
  } else {
    current[index] = expense;
  }

  writeCache(current);
}

export function getExpenses(): Expense[] {
  return readCache();
}

export async function syncExpensesCache() {
  const response = await apiFetch("/expenses");

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { expenses?: unknown };

  const expenses = Array.isArray(payload.expenses)
    ? payload.expenses.map((item) => normalizeExpense(item))
    : [];

  writeCache(expenses);
  return expenses;
}

export async function createExpense(payload: ExpensePayload) {
  const response = await apiFetch("/expenses", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const data = (await response.json()) as { expense?: unknown };
  const saved = normalizeExpense(data.expense);

  upsertCache(saved);
  return saved;
}