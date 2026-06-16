import { useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";

import { getCurrentUser } from "../services/authService";
import { addExpense, deleteExpense, getExpenses } from "../services/expenseService";
import { getCurrentShift, getShiftSummary } from "../services/cashRegisterService";

import type { Expense } from "../types/Expense";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isToday(dateString: string) {
  const value = new Date(dateString);
  const today = new Date();
  return value.toDateString() === today.toDateString();
}

function isSameMonth(dateString: string) {
  const value = new Date(dateString);
  const today = new Date();

  return (
    value.getFullYear() === today.getFullYear() &&
    value.getMonth() === today.getMonth()
  );
}

const PRESET_CATEGORIES = [
  "General",
  "Rent",
  "Utilities",
  "Supplies",
  "Delivery",
  "Maintenance",
  "Refund",
  "Salary",
];

export default function ExpensesPage() {
  const currentUser = getCurrentUser();
  const currentShift = getCurrentShift();
  const shiftSummary = currentShift ? getShiftSummary(currentShift.id) : null;

  const [expenses, setExpenses] = useState<Expense[]>(() => getExpenses());
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [notes, setNotes] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [useCustomCategory, setUseCustomCategory] = useState(false);

  const activeCategory = useCustomCategory ? customCategory : category;

  const filteredExpenses = useMemo(() => {
    const term = search.trim().toLowerCase();

    return expenses.filter((expense) => {
      const matchesSearch =
        !term ||
        expense.expenseNumber.toLowerCase().includes(term) ||
        expense.title.toLowerCase().includes(term) ||
        expense.category.toLowerCase().includes(term) ||
        expense.createdBy.toLowerCase().includes(term);

      return matchesSearch;
    });
  }, [expenses, search]);

  const todayExpenses = useMemo(() => {
    return expenses.filter((expense) => isToday(expense.expenseDate));
  }, [expenses]);

  const monthExpenses = useMemo(() => {
    return expenses.filter((expense) => isSameMonth(expense.expenseDate));
  }, [expenses]);

  const todayTotal = useMemo(
    () => todayExpenses.reduce((sum, item) => sum + item.amount, 0),
    [todayExpenses]
  );

  const monthTotal = useMemo(
    () => monthExpenses.reduce((sum, item) => sum + item.amount, 0),
    [monthExpenses]
  );

  const cashExpensesTotal = useMemo(
    () =>
      monthExpenses
        .filter((expense) => expense.paymentMethod === "cash")
        .reduce((sum, item) => sum + item.amount, 0),
    [monthExpenses]
  );

  const cardExpensesTotal = useMemo(
    () =>
      monthExpenses
        .filter((expense) => expense.paymentMethod === "card")
        .reduce((sum, item) => sum + item.amount, 0),
    [monthExpenses]
  );

  const openShiftStatus = currentShift ? "OPEN" : "CLOSED";

  function refreshExpenses() {
    setExpenses(getExpenses());
  }

  function resetForm() {
    setTitle("");
    setCategory("General");
    setAmount(0);
    setPaymentMethod("cash");
    setNotes("");
    setCustomCategory("");
    setUseCustomCategory(false);
  }

  function handleSave() {
    try {
      const result = addExpense({
        expenseDate: new Date().toISOString(),
        title,
        category: activeCategory,
        amount,
        paymentMethod,
        notes,
        createdBy: currentUser?.name ?? "Admin",
      });

      setExpenses((current) => [...current, result]);
      resetForm();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save expense");
    }
  }

  function handleDelete(expenseId: number) {
    const ok = window.confirm("Delete this expense?");
    if (!ok) return;

    deleteExpense(expenseId);
    refreshExpenses();
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">
            Record cash out and operating expenses
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Shift</div>
            <div className="font-bold mt-1">{openShiftStatus}</div>
          </div>

          <div className="rounded-xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Expected Cash</div>
            <div className="font-bold mt-1">
              {formatMoney(shiftSummary?.expectedCash ?? 0)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Today's Expenses</div>
          <div className="text-3xl font-bold mt-2">{formatMoney(todayTotal)}</div>
          <div className="text-sm text-slate-500 mt-2">
            {todayExpenses.length} records
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Month Expenses</div>
          <div className="text-3xl font-bold mt-2">{formatMoney(monthTotal)}</div>
          <div className="text-sm text-slate-500 mt-2">
            {monthExpenses.length} records
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Cash Expenses</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {formatMoney(cashExpensesTotal)}
          </div>
          <div className="text-sm text-slate-500 mt-2">This month</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Card Expenses</div>
          <div className="text-3xl font-bold mt-2 text-blue-600">
            {formatMoney(cardExpensesTotal)}
          </div>
          <div className="text-sm text-slate-500 mt-2">This month</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <section className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold">New Expense</h2>
              <p className="text-sm text-slate-500 mt-1">
                Add a manual expense or cash out
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-xl p-3"
                placeholder="Rent payment"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>

                {!useCustomCategory ? (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border rounded-xl p-3"
                  >
                    {PRESET_CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full border rounded-xl p-3"
                    placeholder="Custom category"
                  />
                )}
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useCustomCategory}
                    onChange={(e) => setUseCustomCategory(e.target.checked)}
                  />
                  Use custom category
                </label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Amount</label>
                <input
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full border rounded-xl p-3"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`rounded-xl border px-4 py-3 font-medium ${
                      paymentMethod === "cash"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    Cash
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`rounded-xl border px-4 py-3 font-medium ${
                      paymentMethod === "card"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    Card
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border rounded-xl p-3 min-h-[110px]"
                placeholder="Optional note"
              />
            </div>

            <button
              onClick={handleSave}
              className="w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700"
            >
              Save Expense
            </button>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Expense History</h2>
              <p className="text-sm text-slate-500 mt-1">
                All recorded cash out and expenses
              </p>
            </div>

            <div className="w-72">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search expense..."
                className="w-full border rounded-xl p-3"
              />
            </div>
          </div>

          <div className="max-h-[72vh] overflow-auto">
            {filteredExpenses.length === 0 ? (
              <div className="p-6 text-slate-500">No expenses found</div>
            ) : (
              filteredExpenses.map((expense) => (
                <div key={expense.id} className="border-b p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold">{expense.title}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {expense.expenseNumber} • {expense.category} •{" "}
                        {expense.createdBy}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {formatDate(expense.expenseDate)}
                      </div>
                      {expense.notes && (
                        <div className="text-sm text-slate-600 mt-2">
                          {expense.notes}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-lg font-bold ${
                          expense.paymentMethod === "cash"
                            ? "text-red-600"
                            : "text-blue-600"
                        }`}
                      >
                        -{formatMoney(expense.amount)}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {expense.paymentMethod.toUpperCase()}
                      </div>

                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="mt-3 text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}