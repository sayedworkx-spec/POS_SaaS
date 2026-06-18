import { useEffect, useMemo, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { getCurrentUser, getRoleLabel } from "../services/authService";
import {
  getDashboardSnapshot,
  syncDashboardCache,
} from "../services/dashboardService";

import type { DashboardSnapshot } from "../types/Dashboard";

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

export default function DashboardPage() {
  const currentUser = getCurrentUser();

  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(() =>
    getDashboardSnapshot()
  );
  const [error, setError] = useState("");

  async function refresh() {
    try {
      setLoading(true);
      setError("");

      const fresh = await syncDashboardCache();
      setSnapshot(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard");
      setSnapshot(getDashboardSnapshot());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const overviewCards = useMemo(() => {
    if (!snapshot) return [];

    return [
      {
        label: "Today Sales",
        value: snapshot.overview.todaySalesCount,
      },
      {
        label: "Today Revenue",
        value: formatMoney(snapshot.overview.todayRevenue),
      },
      {
        label: "Today Profit",
        value: formatMoney(snapshot.overview.todayProfit),
      },
      {
        label: "Open Shifts",
        value: snapshot.overview.openShiftsCount,
      },
      {
        label: "Low Stock",
        value: snapshot.overview.lowStockProducts,
      },
      {
        label: "Returns",
        value: snapshot.overview.returnsCount,
      },
    ];
  }, [snapshot]);

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Live backend overview for the current session
          </p>
          {currentUser && (
            <div className="mt-2 text-xs text-slate-400">
              Signed in as {currentUser.name} ({getRoleLabel(currentUser.role)})
            </div>
          )}
        </div>

        <button
          onClick={refresh}
          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6 mb-6">
        {overviewCards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-white p-4 shadow">
            <div className="text-xs text-slate-500">{card.label}</div>
            <div className="mt-2 text-2xl font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      {snapshot?.currentShiftSummary && (
        <section className="mb-6 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Current Shift</h2>
              <p className="mt-1 text-sm text-slate-500">
                Opened by {snapshot.currentShiftSummary.shift.userName}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Opened at {formatDate(snapshot.currentShiftSummary.shift.openedAt)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-xs text-slate-500">Difference</div>
              <div
                className={`mt-1 text-xl font-bold ${
                  snapshot.currentShiftSummary.difference === 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {formatMoney(snapshot.currentShiftSummary.difference)}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Opening</div>
              <div className="mt-1 text-lg font-bold">
                {formatMoney(snapshot.currentShiftSummary.openingCash)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Cash In</div>
              <div className="mt-1 text-lg font-bold text-emerald-600">
                {formatMoney(snapshot.currentShiftSummary.cashIn)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Cash Out</div>
              <div className="mt-1 text-lg font-bold text-red-600">
                {formatMoney(snapshot.currentShiftSummary.cashOut)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Expected</div>
              <div className="mt-1 text-lg font-bold">
                {formatMoney(snapshot.currentShiftSummary.expectedCash)}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-bold">Recent Sales</h2>
            <p className="mt-1 text-sm text-slate-500">
              Last invoices created from the backend
            </p>
          </div>

          {loading && !snapshot ? (
            <div className="p-6 text-slate-500">Loading dashboard...</div>
          ) : !snapshot || snapshot.recentSales.length === 0 ? (
            <div className="p-6 text-slate-500">No sales found</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-4 text-left">Invoice</th>
                    <th className="p-4 text-left">Cashier</th>
                    <th className="p-4 text-left">Date</th>
                    <th className="p-4 text-left">Items</th>
                    <th className="p-4 text-left">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.recentSales.map((sale) => (
                    <tr key={sale.id} className="border-t">
                      <td className="p-4 font-semibold">{sale.invoiceNumber}</td>
                      <td className="p-4">{sale.cashier}</td>
                      <td className="p-4 text-sm text-slate-500">
                        {formatDate(sale.saleDate)}
                      </td>
                      <td className="p-4">{sale.itemsCount}</td>
                      <td className="p-4 font-semibold">
                        {formatMoney(sale.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-bold">Low Stock</h2>
            <p className="mt-1 text-sm text-slate-500">
              Products at or below reorder level
            </p>
          </div>

          {!snapshot || snapshot.lowStockProducts.length === 0 ? (
            <div className="p-6 text-slate-500">No low stock products</div>
          ) : (
            <div className="space-y-3 p-4">
              {snapshot.lowStockProducts.map((product) => (
                <div key={product.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{product.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {product.sku} • {product.barcode}
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        product.stock <= 0
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      Stock {product.stock}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    Reorder level: {product.reorderLevel}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-bold">Top Products</h2>
            <p className="mt-1 text-sm text-slate-500">
              Best sellers from recent sales
            </p>
          </div>

          {!snapshot || snapshot.topProducts.length === 0 ? (
            <div className="p-6 text-slate-500">No top products data</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-4 text-left">Product</th>
                    <th className="p-4 text-left">Qty</th>
                    <th className="p-4 text-left">Revenue</th>
                    <th className="p-4 text-left">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.topProducts.map((product) => (
                    <tr key={product.productId} className="border-t">
                      <td className="p-4">
                        <div className="font-semibold">{product.name}</div>
                        <div className="text-xs text-slate-500">{product.sku}</div>
                      </td>
                      <td className="p-4">{product.quantitySold}</td>
                      <td className="p-4">{formatMoney(product.revenue)}</td>
                      <td className="p-4">
                        <span className="font-semibold text-emerald-600">
                          {formatMoney(product.profit)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-bold">Today Summary</h2>
            <p className="mt-1 text-sm text-slate-500">
              Revenue and profit for the current day
            </p>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Sales Count</div>
              <div className="mt-1 text-2xl font-bold">
                {snapshot?.overview.todaySalesCount ?? 0}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Revenue</div>
              <div className="mt-1 text-2xl font-bold">
                {formatMoney(snapshot?.overview.todayRevenue ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Profit</div>
              <div className="mt-1 text-2xl font-bold text-emerald-600">
                {formatMoney(snapshot?.overview.todayProfit ?? 0)}
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}