import { useEffect, useMemo, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { getCurrentUser, getRoleLabel } from "../services/authService";
import { getPnLReportSnapshot, syncPnLReportCache } from "../services/pnlReportService";
import {
  downloadJsonFile,
  printCurrentPage,
} from "../services/reportExportService";

import type { PnLReportSnapshot } from "../types/PnL";

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

function yyyyMmDd(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default function PnLPage() {
  const currentUser = getCurrentUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<PnLReportSnapshot | null>(() =>
    getPnLReportSnapshot()
  );

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return yyyyMmDd(d);
  });

  const [endDate, setEndDate] = useState(() => yyyyMmDd(new Date()));

  async function refresh() {
    try {
      setLoading(true);
      setError("");

      const fresh = await syncPnLReportCache(startDate, endDate);
      setSnapshot(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load P&L");
      setSnapshot(getPnLReportSnapshot());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => snapshot?.totals, [snapshot]);
  const inventory = useMemo(() => snapshot?.inventory, [snapshot]);

  function handleExport() {
    if (!snapshot) return;
    downloadJsonFile("pnl-report", snapshot);
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">P&amp;L Report</h1>
          <p className="text-sm text-slate-500 mt-1">
            Unified financial view: sales, returns, expenses, and inventory impact
          </p>
          {currentUser && (
            <div className="mt-2 text-xs text-slate-400">
              Signed in as {currentUser.name} ({getRoleLabel(currentUser.role)})
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-2 block text-xs text-slate-500">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border bg-white px-3 py-3 shadow"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs text-slate-500">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border bg-white px-3 py-3 shadow"
            />
          </div>

          <button
            onClick={refresh}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          <button
            onClick={handleExport}
            disabled={!snapshot}
            className="rounded-xl border bg-white px-4 py-3 text-sm font-medium disabled:opacity-50"
          >
            Export JSON
          </button>

          <button
            onClick={printCurrentPage}
            className="rounded-xl border bg-white px-4 py-3 text-sm font-medium"
          >
            Print / PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6 mb-6">
        {[
          { label: "Sales", value: totals?.salesCount ?? 0 },
          { label: "Gross Revenue", value: formatMoney(totals?.grossRevenue ?? 0) },
          { label: "Gross Profit", value: formatMoney(totals?.grossProfit ?? 0) },
          { label: "Expenses", value: formatMoney(totals?.totalExpenses ?? 0) },
          { label: "Net Profit", value: formatMoney(totals?.netProfit ?? 0) },
          { label: "Inventory Value", value: formatMoney(inventory?.endingInventoryValue ?? 0) },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl bg-white p-4 shadow">
            <div className="text-xs text-slate-500">{card.label}</div>
            <div className="mt-2 text-2xl font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold">Income Statement</h2>
            <p className="text-sm text-slate-500">
              {snapshot
                ? `${formatDate(snapshot.range.startDate)} → ${formatDate(snapshot.range.endDate)}`
                : "No data loaded"}
            </p>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-4 text-left">Line</th>
                  <th className="p-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {snapshot?.statementLines?.length ? (
                  snapshot.statementLines.map((line) => (
                    <tr key={line.label} className="border-t">
                      <td className={`p-4 ${line.kind === "total" ? "font-bold" : ""}`}>
                        {line.label}
                      </td>
                      <td
                        className={`p-4 text-right ${
                          line.kind === "negative"
                            ? "text-red-600"
                            : line.kind === "total"
                              ? "font-bold text-emerald-600"
                              : line.kind === "subtotal"
                                ? "font-semibold"
                                : ""
                        }`}
                      >
                        {formatMoney(line.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-6 text-slate-500" colSpan={2}>
                      No statement lines
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">Inventory Impact</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ending inventory is tracked separately from profit
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Ending Qty</div>
              <div className="mt-1 text-xl font-bold">
                {formatMoney(inventory?.endingQty ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Ending Cost Value</div>
              <div className="mt-1 text-xl font-bold">
                {formatMoney(inventory?.endingInventoryValue ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Ending Sell Value</div>
              <div className="mt-1 text-xl font-bold">
                {formatMoney(inventory?.endingInventorySellValue ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Potential Margin</div>
              <div className="mt-1 text-xl font-bold text-emerald-600">
                {formatMoney(inventory?.inventoryPotentialMargin ?? 0)}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border p-4">
              <div className="text-xs text-slate-500">Low Stock</div>
              <div className="mt-1 text-xl font-bold">
                {snapshot?.overview.lowStockProducts ?? 0}
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-xs text-slate-500">Zero Stock</div>
              <div className="mt-1 text-xl font-bold text-red-600">
                {inventory?.zeroStockCount ?? 0}
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-xs text-slate-500">Active Products</div>
              <div className="mt-1 text-xl font-bold">
                {inventory?.activeProducts ?? 0}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-bold">Expenses by Category</h2>
          </div>
          <div className="space-y-3 p-4">
            {snapshot?.expensesByCategory?.length ? (
              snapshot.expensesByCategory.map((row) => (
                <div key={row.category} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{row.category}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.count} entries
                      </div>
                    </div>
                    <div className="font-semibold">{formatMoney(row.amount)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-2 text-slate-500">No expense categories</div>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-bold">Recent Sales</h2>
          </div>
          <div className="space-y-3 p-4">
            {snapshot?.recentSales?.length ? (
              snapshot.recentSales.map((sale) => (
                <div key={sale.id} className="rounded-xl border p-4">
                  <div className="font-semibold">{sale.invoiceNumber}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {sale.cashier} • {formatDate(sale.saleDate)}
                  </div>
                  <div className="mt-2 text-sm">Total: {formatMoney(sale.total)}</div>
                </div>
              ))
            ) : (
              <div className="p-2 text-slate-500">No sales</div>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-bold">Recent Expenses</h2>
          </div>
          <div className="space-y-3 p-4">
            {snapshot?.recentExpenses?.length ? (
              snapshot.recentExpenses.map((expense) => (
                <div key={expense.id} className="rounded-xl border p-4">
                  <div className="font-semibold">{expense.expenseNumber}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {expense.category} • {expense.createdBy}
                  </div>
                  <div className="mt-2 text-sm">
                    Amount: {formatMoney(expense.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-2 text-slate-500">No expenses</div>
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}