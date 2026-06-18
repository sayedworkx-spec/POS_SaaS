import { useEffect, useMemo, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { getCurrentUser } from "../services/authService";
import { getCurrentShift, syncCashRegisterCache } from "../services/cashRegisterService";
import { createExpense, getExpenses, syncExpensesCache } from "../services/expenseService";
import { getSettings } from "../services/settingsService";

import type { Expense } from "../types/Expense";

function formatMoney(value: number, symbol: string) {
  return `${symbol}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ExpensesPage() {
  const currentUser = getCurrentUser();
  const settings = getSettings();
  const currentShift = getCurrentShift();

  const [expenses, setExpenses] = useState<Expense[]>(() => getExpenses());
  const [expenseNumber, setExpenseNumber] = useState(`EXP-${Date.now().toString().slice(-6)}`);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 16));
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState<"all" | "cash" | "card">("all");

  async function refreshAll() {
    try {
      const fresh = await syncExpensesCache();
      setExpenses(fresh);
    } catch {
      setExpenses(getExpenses());
    }
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  const filteredExpenses = useMemo(() => {
    const term = search.trim().toLowerCase();

    return expenses.filter((item) => {
      const matchesSearch =
        !term ||
        item.expenseNumber.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.createdBy.toLowerCase().includes(term);

      const matchesMethod =
        filterMethod === "all" || item.paymentMethod === filterMethod;

      return matchesSearch && matchesMethod;
    });
  }, [expenses, search, filterMethod]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, item) => sum + item.amount, 0);
  }, [expenses]);

  const cashExpenses = useMemo(() => {
    return expenses
      .filter((item) => item.paymentMethod === "cash")
      .reduce((sum, item) => sum + item.amount, 0);
  }, [expenses]);

  const cardExpenses = useMemo(() => {
    return expenses
      .filter((item) => item.paymentMethod === "card")
      .reduce((sum, item) => sum + item.amount, 0);
  }, [expenses]);

  async function handleCreate() {
  try {
    setSaving(true);
    setError("");

    await createExpense({
      expenseNumber,
      expenseDate: new Date(expenseDate).toISOString(),
      category,
      description,
      amount,
      paymentMethod,
      shiftId:
        paymentMethod === "cash"
          ? currentShift?.id ?? null
          : null,
      createdBy: currentUser?.name ?? "System",
    });

    if (paymentMethod === "cash") {
      await syncCashRegisterCache();
    }

    await refreshAll();

    setExpenseNumber(`EXP-${Date.now().toString().slice(-6)}`);
    setExpenseDate(new Date().toISOString().slice(0, 16));
    setCategory("General");
    setDescription("");
    setAmount(0);
    setPaymentMethod("cash");
    setError("");
  } catch (err) {
    setError(err instanceof Error ? err.message : "Unable to save expense");
  } finally {
    setSaving(false);
  }
}

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">
            Record operating expenses and tie cash expenses to the shift
          </p>
          {currentUser && (
            <div className="mt-2 text-xs text-slate-400">
              Signed in as {currentUser.name}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Total</div>
            <div className="mt-1 text-xl font-bold">
              {formatMoney(totalExpenses, settings.currencySymbol)}
            </div>
          </div>

          <div className="rounded-2xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Cash</div>
            <div className="mt-1 text-xl font-bold text-red-600">
              {formatMoney(cashExpenses, settings.currencySymbol)}
            </div>
          </div>

          <div className="rounded-2xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Card</div>
            <div className="mt-1 text-xl font-bold text-slate-700">
              {formatMoney(cardExpenses, settings.currencySymbol)}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">New Expense</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add a fresh expense record
          </p>

          <div className="mt-5 grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Expense Number</label>
              <input
                type="text"
                value={expenseNumber}
                onChange={(e) => setExpenseNumber(e.target.value)}
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Date</label>
              <input
                type="datetime-local"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Amount</label>
                <input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full rounded-xl border p-3"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border p-3"
                placeholder="Rent, electricity, transport..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "cash" | "card")}
                  className="w-full rounded-xl border p-3"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Current Shift</label>
                <input
                  type="text"
                  value={paymentMethod === "cash" ? `#${currentShift?.id ?? "No open shift"}` : "Not required"}
                  disabled
                  className="w-full rounded-xl border bg-slate-50 p-3 text-slate-600"
                />
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={saving}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Expense"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Expense History</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search and filter expense records
              </p>
            </div>

            <div className="flex gap-3">
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value as "all" | "cash" | "card")}
                className="rounded-xl border p-3"
              >
                <option value="all">All</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search number, category, description..."
              className="w-full rounded-xl border p-3"
            />
          </div>

          <div className="mt-5 max-h-[42rem] space-y-3 overflow-auto pr-1">
            {filteredExpenses.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-slate-500">
                No expenses found
              </div>
            ) : (
              filteredExpenses.map((expense) => (
                <div key={expense.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{expense.expenseNumber}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {expense.category} • {expense.createdBy}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDate(expense.expenseDate)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold">
                        {formatMoney(expense.amount, settings.currencySymbol)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {expense.paymentMethod.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-slate-600">
                    {expense.description}
                  </div>

                  {expense.shiftId !== null && (
                    <div className="mt-2 text-xs text-slate-500">
                      Shift #{expense.shiftId}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}