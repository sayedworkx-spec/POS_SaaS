import { useEffect, useMemo, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { getCurrentUser, getRoleLabel } from "../services/authService";
import {
  getProfitReportSnapshot,
  syncProfitReportCache,
} from "../services/profitReportService";

import type { ProfitReportSnapshot } from "../types/ProfitReport";

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

export default function ProfitReportPage() {
  const currentUser = getCurrentUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<ProfitReportSnapshot | null>(() =>
    getProfitReportSnapshot()
  );

  const [startDate, setStartDate] = useState(() => {
    const value = new Date();
    value.setDate(1);
    return yyyyMmDd(value);
  });

  const [endDate, setEndDate] = useState(() => yyyyMmDd(new Date()));

  async function refresh() {
    try {
      setLoading(true);
      setError("");

      const fresh = await syncProfitReportCache(startDate, endDate);
      setSnapshot(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load profit report");
      setSnapshot(getProfitReportSnapshot());
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

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Profit Report</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gross profit, returns, expenses, inventory impact, and net profit
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
          { label: "Revenue", value: formatMoney(totals?.grossRevenue ?? 0) },
          { label: "Gross Profit", value: formatMoney(totals?.grossProfit ?? 0) },
          { label: "Operating Profit", value: formatMoney(totals?.operatingProfit ?? 0) },
          { label: "Net Profit", value: formatMoney(totals?.netProfit ?? 0) },
          { label: "Expenses", value: formatMoney(totals?.totalExpenses ?? 0) },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl bg-white p-4 shadow">
            <div className="text-xs text-slate-500">{card.label}</div>
            <div className="mt-2 text-2xl font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-bold">Period Summary</h2>
            <p className="mt-1 text-sm text-slate-500">
              {snapshot
                ? `${formatDate(snapshot.range.startDate)} → ${formatDate(snapshot.range.endDate)}`
                : "No data loaded"}
            </p>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Gross Revenue</div>
              <div className="mt-1 text-xl font-bold">
                {formatMoney(totals?.grossRevenue ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Gross COGS</div>
              <div className="mt-1 text-xl font-bold">
                {formatMoney(totals?.grossCOGS ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Returns Refunds</div>
              <div className="mt-1 text-xl font-bold">
                {formatMoney(totals?.refundAmount ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Returned Cost</div>
              <div className="mt-1 text-xl font-bold">
                {formatMoney(totals?.returnedCost ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Operating Profit</div>
              <div className="mt-1 text-xl font-bold">
                {formatMoney(totals?.operatingProfit ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Total Expenses</div>
              <div className="mt-1 text-xl font-bold text-red-600">
                {formatMoney(totals?.totalExpenses ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Net Profit</div>
              <div className="mt-1 text-xl font-bold text-emerald-600">
                {formatMoney(totals?.netProfit ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Margin %</div>
              <div className="mt-1 text-xl font-bold">
                {(totals?.marginPercent ?? 0).toFixed(1)}%
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-bold">Inventory Impact</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ending inventory valuation is tracked separately from P&L
            </p>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2">
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

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Low Stock</div>
              <div className="mt-1 text-xl font-bold text-amber-600">
                {inventory?.lowStockCount ?? 0}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Zero Stock</div>
              <div className="mt-1 text-xl font-bold text-red-600">
                {inventory?.zeroStockCount ?? 0}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-bold">Top Products</h2>
            <p className="mt-1 text-sm text-slate-500">
              Best performing items in the selected range
            </p>
          </div>

          {!snapshot || snapshot.topProducts.length === 0 ? (
            <div className="p-6 text-slate-500">No product data</div>
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
            <h2 className="text-xl font-bold">Expenses by Category</h2>
            <p className="mt-1 text-sm text-slate-500">
              Breakdown of operating expenses
            </p>
          </div>

          {!snapshot || snapshot.expensesByCategory.length === 0 ? (
            <div className="p-6 text-slate-500">No expense data</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-4 text-left">Category</th>
                    <th className="p-4 text-left">Count</th>
                    <th className="p-4 text-left">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.expensesByCategory.map((row) => (
                    <tr key={row.category} className="border-t">
                      <td className="p-4 font-medium">{row.category}</td>
                      <td className="p-4">{row.count}</td>
                      <td className="p-4">{formatMoney(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
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
                  <div className="mt-2 text-sm">
                    Total: {formatMoney(sale.total)}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-2 text-slate-500">No sales</div>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-bold">Recent Returns</h2>
          </div>
          <div className="space-y-3 p-4">
            {snapshot?.recentReturns?.length ? (
              snapshot.recentReturns.map((ret) => (
                <div key={ret.id} className="rounded-xl border p-4">
                  <div className="font-semibold">{ret.returnNumber}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {ret.cashier} • {formatDate(ret.returnDate)}
                  </div>
                  <div className="mt-2 text-sm">
                    Refund: {formatMoney(ret.refundAmount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-2 text-slate-500">No returns</div>
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