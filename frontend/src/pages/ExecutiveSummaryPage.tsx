import { useEffect, useMemo, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { getCurrentUser, getRoleLabel } from "../services/authService";
import {
  getExecutiveSummarySnapshot,
  syncExecutiveSummaryCache,
} from "../services/executiveSummaryService";
import {
  downloadJsonFile,
  printCurrentPage,
} from "../services/reportExportService";

import type { ExecutiveSummarySnapshot } from "../types/ExecutiveSummary";

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

export default function ExecutiveSummaryPage() {
  const currentUser = getCurrentUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<ExecutiveSummarySnapshot | null>(() =>
    getExecutiveSummarySnapshot()
  );

  async function refresh() {
    try {
      setLoading(true);
      setError("");

      const fresh = await syncExecutiveSummaryCache();
      setSnapshot(fresh);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load executive summary"
      );
      setSnapshot(getExecutiveSummarySnapshot());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const cards = useMemo(() => {
    return [
      { label: "Today Revenue", value: formatMoney(snapshot?.overview.todayRevenue ?? 0) },
      { label: "Today Profit", value: formatMoney(snapshot?.overview.todayProfit ?? 0) },
      { label: "Net Profit", value: formatMoney(snapshot?.totals.netProfit ?? 0) },
      { label: "Inventory Value", value: formatMoney(snapshot?.inventory.endingInventoryValue ?? 0) },
      { label: "Low Stock", value: snapshot?.overview.lowStockProducts ?? 0 },
      { label: "Open Shifts", value: snapshot?.overview.openShiftsCount ?? 0 },
    ];
  }, [snapshot]);

  function handleExport() {
    if (!snapshot) return;
    downloadJsonFile("executive-summary", snapshot);
  }

  return (
    <MainLayout>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Executive Summary</h1>
          <p className="mt-1 text-sm text-slate-500">
            One screen for management, alerts, and the main KPIs
          </p>
          {currentUser && (
            <div className="mt-2 text-xs text-slate-400">
              Signed in as {currentUser.name} ({getRoleLabel(currentUser.role)})
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
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
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-white p-4 shadow">
            <div className="text-xs text-slate-500">{card.label}</div>
            <div className="mt-2 text-2xl font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">Alerts</h2>
          <div className="mt-4 space-y-3">
            {snapshot?.alerts?.length ? (
              snapshot.alerts.map((alert, index) => (
                <div
                  key={`${alert.title}-${index}`}
                  className={`rounded-xl border p-4 ${
                    alert.level === "critical"
                      ? "border-red-200 bg-red-50"
                      : alert.level === "warning"
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="font-semibold">{alert.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{alert.details}</div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-slate-500">
                No alerts
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">Current Period</h2>
          <p className="mt-1 text-sm text-slate-500">
            {snapshot
              ? `${formatDate(snapshot.range.startDate)} → ${formatDate(snapshot.range.endDate)}`
              : "No data loaded"}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Gross Revenue</div>
              <div className="mt-1 text-xl font-bold">
                {formatMoney(snapshot?.totals.grossRevenue ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Total Expenses</div>
              <div className="mt-1 text-xl font-bold">
                {formatMoney(snapshot?.totals.totalExpenses ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Net Cash</div>
              <div className="mt-1 text-xl font-bold">
                {formatMoney(snapshot?.totals.netCash ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Margin %</div>
              <div className="mt-1 text-xl font-bold">
                {(snapshot?.totals.marginPercent ?? 0).toFixed(1)}%
              </div>
            </div>
          </div>

          {snapshot?.currentShiftSummary && (
            <div className="mt-6 rounded-xl border p-4">
              <div className="text-sm font-semibold">Open Shift</div>
              <div className="mt-1 text-xs text-slate-500">
                {snapshot.currentShiftSummary.shift.userName} •{" "}
                {formatDate(snapshot.currentShiftSummary.shift.openedAt)}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500">Expected Cash</div>
                  <div className="font-semibold">
                    {formatMoney(snapshot.currentShiftSummary.expectedCash)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Difference</div>
                  <div className="font-semibold">
                    {formatMoney(snapshot.currentShiftSummary.difference)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">Top Products</h2>
          <div className="mt-4 space-y-3">
            {snapshot?.topProducts?.length ? (
              snapshot.topProducts.map((item) => (
                <div key={item.productId} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatMoney(item.revenue)}</div>
                      <div className="text-xs text-slate-500">Qty {item.quantitySold}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">No data</div>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">Low Stock</h2>
          <div className="mt-4 space-y-3">
            {snapshot?.lowStockProducts?.length ? (
              snapshot.lowStockProducts.map((item) => (
                <div key={item.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{item.stock}</div>
                      <div className="text-xs text-slate-500">
                        Reorder {item.reorderLevel}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">No low stock items</div>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">Recent Expenses</h2>
          <div className="mt-4 space-y-3">
            {snapshot?.recentExpenses?.length ? (
              snapshot.recentExpenses.map((expense) => (
                <div key={expense.id} className="rounded-xl border p-4">
                  <div className="font-semibold">{expense.expenseNumber}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {expense.category} • {expense.createdBy}
                  </div>
                  <div className="mt-2 text-sm">
                    {formatMoney(expense.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">No recent expenses</div>
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}