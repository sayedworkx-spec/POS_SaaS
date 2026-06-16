import { Link } from "react-router-dom";
import { useMemo } from "react";

import MainLayout from "../layouts/MainLayout";

import { getProducts } from "../services/productService";
import { getSales } from "../services/salesService";
import { getExpenses } from "../services/expenseService";
import { getReturns } from "../services/returnService";
import {
  getCurrentShift,
  getShiftSummary,
  getCashShifts,
  getCashMovements,
} from "../services/cashRegisterService";

import type { Sale } from "../types/Sale";
import type { Expense } from "../types/Expense";
import type { SaleReturn } from "../types/Return";

type DaySeriesItem = {
  label: string;
  revenue: number;
  profit: number;
  expenses: number;
  returns: number;
};

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

function isSameDay(dateString: string, target: Date) {
  const value = new Date(dateString);

  return value.toDateString() === target.toDateString();
}

function startOfDay(date: Date) {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function addDays(date: Date, days: number) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}

function getDayLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
  });
}

function sumRevenue(sales: Sale[]) {
  return sales.reduce((sum, sale) => sum + sale.total, 0);
}

function sumCost(sales: Sale[]) {
  return sales.reduce((sum, sale) => sum + sale.costTotal, 0);
}

function sumExpenses(expenses: Expense[]) {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

function sumReturns(returnsRecords: SaleReturn[]) {
  return returnsRecords.reduce((sum, record) => sum + record.refundAmount, 0);
}

function sumReturnProfitImpact(returnsRecords: SaleReturn[]) {
  return returnsRecords.reduce((sum, record) => sum + record.profitImpact, 0);
}

export default function DashboardPage() {
  const products = useMemo(() => getProducts(), []);
  const sales = useMemo(() => getSales(), []);
  const expenses = useMemo(() => getExpenses(), []);
  const returnsRecords = useMemo(() => getReturns(), []);

  const currentShift = getCurrentShift();
  const currentShiftSummary = currentShift
    ? getShiftSummary(currentShift.id)
    : null;

  const todaySales = useMemo(
    () => sales.filter((sale) => isToday(sale.saleDate)),
    [sales]
  );

  const todayExpenses = useMemo(
    () => expenses.filter((expense) => isToday(expense.expenseDate)),
    [expenses]
  );

  const todayReturns = useMemo(
    () => returnsRecords.filter((record) => isToday(record.returnDate)),
    [returnsRecords]
  );

  const todayRevenue = useMemo(() => sumRevenue(todaySales), [todaySales]);
  const todayCost = useMemo(() => sumCost(todaySales), [todaySales]);
  const todayGrossProfit = todayRevenue - todayCost;
  const todayExpenseTotal = useMemo(
    () => sumExpenses(todayExpenses),
    [todayExpenses]
  );
  const todayReturnImpact = useMemo(
    () => sumReturnProfitImpact(todayReturns),
    [todayReturns]
  );
  const todayNetProfit = todayGrossProfit - todayReturnImpact - todayExpenseTotal;

  const monthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  const monthSales = useMemo(() => {
    return sales.filter((sale) => new Date(sale.saleDate) >= monthStart);
  }, [sales, monthStart]);

  const monthExpenses = useMemo(() => {
    return expenses.filter((expense) => new Date(expense.expenseDate) >= monthStart);
  }, [expenses, monthStart]);

  const monthReturns = useMemo(() => {
    return returnsRecords.filter((record) => new Date(record.returnDate) >= monthStart);
  }, [returnsRecords, monthStart]);

  const monthRevenue = useMemo(() => sumRevenue(monthSales), [monthSales]);
  const monthCost = useMemo(() => sumCost(monthSales), [monthSales]);
  const monthGrossProfit = monthRevenue - monthCost;
  const monthExpenseTotal = useMemo(
    () => sumExpenses(monthExpenses),
    [monthExpenses]
  );
  const monthReturnTotal = useMemo(
    () => sumReturns(monthReturns),
    [monthReturns]
  );
  const monthReturnImpact = useMemo(
    () => sumReturnProfitImpact(monthReturns),
    [monthReturns]
  );
  const monthNetProfit =
    monthGrossProfit - monthReturnImpact - monthExpenseTotal;

  const lowStockProducts = useMemo(() => {
    return products
      .filter((product) => product.stock <= product.reorderLevel)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6);
  }, [products]);

  const activeProducts = useMemo(() => {
    return products.filter((product) => product.isActive).length;
  }, [products]);

  const inventoryValue = useMemo(() => {
    return products.reduce(
      (sum, product) => sum + product.stock * product.costPrice,
      0
    );
  }, [products]);

  const openShiftsCount = useMemo(() => {
    return getCashShifts().filter((shift) => shift.status === "open").length;
  }, []);

  const todayCashMovements = useMemo(() => {
    return getCashMovements().filter((movement) => isToday(movement.createdAt));
  }, []);

  const totalCashMovementsOut = useMemo(() => {
    return getCashMovements()
      .filter((movement) => movement.type === "OUT" && isToday(movement.createdAt))
      .reduce((sum, movement) => sum + movement.amount, 0);
  }, []);

  const recentSales = useMemo(() => {
    return sales.slice().reverse().slice(0, 8);
  }, [sales]);

  const recentExpenses = useMemo(() => {
    return expenses.slice().reverse().slice(0, 8);
  }, [expenses]);

  const recentReturns = useMemo(() => {
    return returnsRecords.slice().reverse().slice(0, 8);
  }, [returnsRecords]);

  const weeklySeries = useMemo<DaySeriesItem[]>(() => {
    const today = startOfDay(new Date());
    const days = Array.from({ length: 7 }, (_, index) =>
      addDays(today, index - 6)
    );

    return days.map((day) => {
      const daySales = sales.filter((sale) => isSameDay(sale.saleDate, day));
      const dayExpenses = expenses.filter((expense) =>
        isSameDay(expense.expenseDate, day)
      );
      const dayReturns = returnsRecords.filter((record) =>
        isSameDay(record.returnDate, day)
      );

      const revenue = sumRevenue(daySales);
      const grossProfit = revenue - sumCost(daySales);
      const expensesTotal = sumExpenses(dayExpenses);
      const returnsImpact = sumReturnProfitImpact(dayReturns);
      const profit = grossProfit - returnsImpact - expensesTotal;

      return {
        label: getDayLabel(day),
        revenue,
        profit,
        expenses: expensesTotal,
        returns: sumReturns(dayReturns),
      };
    });
  }, [sales, expenses, returnsRecords]);

  const maxSeriesValue = useMemo(() => {
    const values = weeklySeries.flatMap((item) => [
      item.revenue,
      item.profit,
      item.expenses,
      item.returns,
    ]);

    return Math.max(1, ...values);
  }, [weeklySeries]);

  const topProducts = useMemo(() => {
    const map = new Map<
      number,
      {
        productId: number;
        sku: string;
        name: string;
        quantity: number;
        revenue: number;
        cost: number;
        profit: number;
      }
    >();

    monthSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const existing = map.get(item.productId) ?? {
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          quantity: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };

        const itemCost = Number(item.costTotal ?? item.costPrice * item.quantity);

        existing.quantity += item.quantity;
        existing.revenue += item.lineTotal;
        existing.cost += itemCost;
        existing.profit += item.lineTotal - itemCost;

        map.set(item.productId, existing);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [monthSales]);

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Live operational overview
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/sales"
            className="rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white"
          >
            Open Sales
          </Link>

          <Link
            to="/cash-register"
            className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white"
          >
            Cash Register
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 mb-6">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Today's Revenue</div>
          <div className="text-3xl font-bold mt-2">{formatMoney(todayRevenue)}</div>
          <div className="text-sm text-slate-500 mt-2">
            {todaySales.length} invoices
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Today's Gross Profit</div>
          <div className="text-3xl font-bold mt-2 text-emerald-600">
            {formatMoney(todayGrossProfit)}
          </div>
          <div className="text-sm text-slate-500 mt-2">
            Revenue minus sold cost
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Today's Returns</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {formatMoney(sumReturns(todayReturns))}
          </div>
          <div className="text-sm text-slate-500 mt-2">
            Return impact {formatMoney(todayReturnImpact)}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Today's Expenses</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {formatMoney(todayExpenseTotal)}
          </div>
          <div className="text-sm text-slate-500 mt-2">
            Manual operating expenses
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Today's Net Profit</div>
          <div className="text-3xl font-bold mt-2">
            {formatMoney(todayNetProfit)}
          </div>
          <div className="text-sm text-slate-500 mt-2">
            After returns and expenses
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 mb-6">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Month Revenue</div>
          <div className="text-3xl font-bold mt-2">{formatMoney(monthRevenue)}</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Month Gross Profit</div>
          <div className="text-3xl font-bold mt-2 text-emerald-600">
            {formatMoney(monthGrossProfit)}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Month Returns</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {formatMoney(monthReturnTotal)}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Month Expenses</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {formatMoney(monthExpenseTotal)}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Month Net Profit</div>
          <div className="text-3xl font-bold mt-2">
            {formatMoney(monthNetProfit)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Products</div>
          <div className="text-3xl font-bold mt-2">{products.length}</div>
          <div className="text-sm text-slate-500 mt-2">
            {activeProducts} active
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Low Stock Items</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {lowStockProducts.length}
          </div>
          <div className="text-sm text-slate-500 mt-2">Need replenishment</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Cash Movements Today</div>
          <div className="text-3xl font-bold mt-2">{todayCashMovements.length}</div>
          <div className="text-sm text-slate-500 mt-2">In / Out entries</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Open Shifts</div>
          <div className="text-3xl font-bold mt-2">{openShiftsCount}</div>
          <div className="text-sm text-slate-500 mt-2">Currently active</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Inventory Value</div>
          <div className="text-3xl font-bold mt-2">{formatMoney(inventoryValue)}</div>
          <div className="text-sm text-slate-500 mt-2">Cost value of stock</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Manual Cash Out Today</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {formatMoney(totalCashMovementsOut)}
          </div>
          <div className="text-sm text-slate-500 mt-2">OUT movements only</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Shift Status</div>
          <div className="text-3xl font-bold mt-2">
            {currentShift ? "OPEN" : "CLOSED"}
          </div>
          <div className="text-sm text-slate-500 mt-2">
            {currentShiftSummary
              ? `Expected cash: ${formatMoney(currentShiftSummary.expectedCash)}`
              : "No active shift"}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Returns Today</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {sumReturns(todayReturns)}
          </div>
          <div className="text-sm text-slate-500 mt-2">Refund value</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] mb-6">
        <section className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">7-Day Performance</h2>
              <p className="text-sm text-slate-500 mt-1">
                Revenue, profit, expenses, and returns trend
              </p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3 items-end h-72">
            {weeklySeries.map((item) => {
              const revenueHeight = `${Math.max(8, (item.revenue / maxSeriesValue) * 100)}%`;
              const profitHeight = `${Math.max(8, (item.profit / maxSeriesValue) * 100)}%`;
              const expenseHeight = `${Math.max(8, (item.expenses / maxSeriesValue) * 100)}%`;
              const returnsHeight = `${Math.max(8, (item.returns / maxSeriesValue) * 100)}%`;

              return (
                <div key={item.label} className="flex h-full flex-col justify-end">
                  <div className="flex flex-1 items-end gap-1">
                    <div className="flex-1 rounded-t-lg bg-emerald-500/80" style={{ height: revenueHeight }} />
                    <div className="flex-1 rounded-t-lg bg-slate-900/80" style={{ height: profitHeight }} />
                    <div className="flex-1 rounded-t-lg bg-red-500/80" style={{ height: expenseHeight }} />
                    <div className="flex-1 rounded-t-lg bg-orange-500/80" style={{ height: returnsHeight }} />
                  </div>

                  <div className="mt-3 text-center">
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Rev {formatMoney(item.revenue)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-emerald-500/80" />
              Revenue
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-slate-900/80" />
              Profit
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-red-500/80" />
              Expenses
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded bg-orange-500/80" />
              Returns
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-5">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Low Stock Alerts</h2>
            <p className="text-sm text-slate-500 mt-1">
              Products that need replenishment
            </p>
          </div>

          <div className="space-y-3 max-h-[18rem] overflow-auto pr-1">
            {lowStockProducts.length === 0 ? (
              <div className="text-slate-500">No low stock items</div>
            ) : (
              lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-xl border p-4 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold">{product.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      SKU {product.sku} • BAR {product.barcode}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-red-600">{product.stock}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Reorder {product.reorderLevel}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/stock-report"
              className="rounded-xl border px-4 py-3 text-sm font-medium"
            >
              Stock Report
            </Link>

            <Link
              to="/products"
              className="rounded-xl border px-4 py-3 text-sm font-medium"
            >
              Products
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Top Products</h2>
              <p className="text-sm text-slate-500 mt-1">
                Best selling products this month
              </p>
            </div>

            <Link
              to="/profit-report"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              View profit report
            </Link>
          </div>

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
                {topProducts.length === 0 ? (
                  <tr>
                    <td className="p-5 text-slate-500" colSpan={4}>
                      No products sold this month
                    </td>
                  </tr>
                ) : (
                  topProducts.map((item) => (
                    <tr key={item.productId} className="border-t">
                      <td className="p-4">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {item.sku}
                        </div>
                      </td>
                      <td className="p-4">{item.quantity}</td>
                      <td className="p-4">{formatMoney(item.revenue)}</td>
                      <td className="p-4 font-semibold text-emerald-600">
                        {formatMoney(item.profit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Net Profit Summary</h2>
              <p className="text-sm text-slate-500 mt-1">
                Gross profit minus returns and expenses
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 p-5">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Today Net Profit</div>
              <div className="text-2xl font-bold mt-2">
                {formatMoney(todayNetProfit)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Month Net Profit</div>
              <div className="text-2xl font-bold mt-2">
                {formatMoney(monthNetProfit)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Today Returns Count</div>
              <div className="text-2xl font-bold mt-2">{todayReturns.length}</div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Month Returns Count</div>
              <div className="text-2xl font-bold mt-2">{monthReturns.length}</div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
              <div className="text-xs text-slate-500">Expected Cash</div>
              <div className="text-2xl font-bold mt-2">
                {currentShiftSummary
                  ? formatMoney(currentShiftSummary.expectedCash)
                  : "0"}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr] mt-6">
        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Recent Sales</h2>
              <p className="text-sm text-slate-500 mt-1">
                Latest invoices created in the system
              </p>
            </div>

            <Link
              to="/sales-history"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="divide-y">
            {recentSales.length === 0 ? (
              <div className="p-5 text-slate-500">No sales yet</div>
            ) : (
              recentSales.map((sale) => (
                <div key={sale.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{sale.invoiceNumber}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {sale.cashier} • {formatDate(sale.saleDate)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold">{formatMoney(sale.total)}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {sale.paymentMethod.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Recent Returns</h2>
              <p className="text-sm text-slate-500 mt-1">
                Latest refunds and stock reversals
              </p>
            </div>

            <Link
              to="/returns"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="divide-y">
            {recentReturns.length === 0 ? (
              <div className="p-5 text-slate-500">No returns yet</div>
            ) : (
              recentReturns.map((record) => (
                <div key={record.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{record.returnNumber}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {record.originalInvoiceNumber} • {record.reason}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {formatDate(record.returnDate)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-red-600">
                        -{formatMoney(record.refundAmount)}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Profit impact {formatMoney(record.profitImpact)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr] mt-6">
        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Recent Expenses</h2>
              <p className="text-sm text-slate-500 mt-1">
                Latest operating expenses and cash out
              </p>
            </div>

            <Link
              to="/expenses"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="divide-y">
            {recentExpenses.length === 0 ? (
              <div className="p-5 text-slate-500">No expenses yet</div>
            ) : (
              recentExpenses.map((expense) => (
                <div key={expense.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{expense.title}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {expense.expenseNumber} • {expense.category} •{" "}
                        {expense.createdBy}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {formatDate(expense.expenseDate)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-red-600">
                        -{formatMoney(expense.amount)}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {expense.paymentMethod.toUpperCase()}
                      </div>
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