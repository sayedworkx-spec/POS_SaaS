import { Link } from "react-router-dom";
import { useMemo } from "react";

import MainLayout from "../layouts/MainLayout";
import { getSales } from "../services/salesService";
import { getExpenses } from "../services/expenseService";
import { getReturns } from "../services/returnService";

import type { Sale } from "../types/Sale";
import type { Expense } from "../types/Expense";
import type { SaleReturn } from "../types/Return";

type ProfitProductRow = {
  productId: number;
  sku: string;
  name: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
};

type ExpenseCategoryRow = {
  category: string;
  amount: number;
  count: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
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

function sumRevenue(sales: Sale[]) {
  return sales.reduce((sum, sale) => sum + sale.total, 0);
}

function sumCost(sales: Sale[]) {
  return sales.reduce((sum, sale) => sum + sale.costTotal, 0);
}

function sumExpenses(expenses: Expense[]) {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

function sumRefunds(returnsRecords: SaleReturn[]) {
  return returnsRecords.reduce((sum, record) => sum + record.refundAmount, 0);
}

function sumReturnCost(returnsRecords: SaleReturn[]) {
  return returnsRecords.reduce((sum, record) => sum + record.costAmount, 0);
}

function sumReturnProfitImpact(returnsRecords: SaleReturn[]) {
  return returnsRecords.reduce((sum, record) => sum + record.profitImpact, 0);
}

export default function ProfitReportPage() {
  const sales = useMemo(() => getSales(), []);
  const expenses = useMemo(() => getExpenses(), []);
  const returnsRecords = useMemo(() => getReturns(), []);

  const todaySales = useMemo(() => {
    return sales.filter((sale) => isToday(sale.saleDate));
  }, [sales]);

  const monthSales = useMemo(() => {
    return sales.filter((sale) => isSameMonth(sale.saleDate));
  }, [sales]);

  const todayExpenses = useMemo(() => {
    return expenses.filter((expense) => isToday(expense.expenseDate));
  }, [expenses]);

  const monthExpenses = useMemo(() => {
    return expenses.filter((expense) => isSameMonth(expense.expenseDate));
  }, [expenses]);

  const todayReturns = useMemo(() => {
    return returnsRecords.filter((record) => isToday(record.returnDate));
  }, [returnsRecords]);

  const monthReturns = useMemo(() => {
    return returnsRecords.filter((record) => isSameMonth(record.returnDate));
  }, [returnsRecords]);

  const todayRevenue = useMemo(() => sumRevenue(todaySales), [todaySales]);
  const todayCost = useMemo(() => sumCost(todaySales), [todaySales]);
  const todayGrossProfit = todayRevenue - todayCost;

  const todayExpenseTotal = useMemo(
    () => sumExpenses(todayExpenses),
    [todayExpenses]
  );

  const todayReturnRefundTotal = useMemo(
    () => sumRefunds(todayReturns),
    [todayReturns]
  );

  const todayReturnCostTotal = useMemo(
    () => sumReturnCost(todayReturns),
    [todayReturns]
  );

  const todayReturnProfitImpact = useMemo(
    () => sumReturnProfitImpact(todayReturns),
    [todayReturns]
  );

  const todayNetProfit =
    todayGrossProfit - todayReturnProfitImpact - todayExpenseTotal;

  const monthRevenue = useMemo(() => sumRevenue(monthSales), [monthSales]);
  const monthCost = useMemo(() => sumCost(monthSales), [monthSales]);
  const monthGrossProfit = monthRevenue - monthCost;

  const monthExpenseTotal = useMemo(
    () => sumExpenses(monthExpenses),
    [monthExpenses]
  );

  const monthReturnRefundTotal = useMemo(
    () => sumRefunds(monthReturns),
    [monthReturns]
  );

  const monthReturnCostTotal = useMemo(
    () => sumReturnCost(monthReturns),
    [monthReturns]
  );

  const monthReturnProfitImpact = useMemo(
    () => sumReturnProfitImpact(monthReturns),
    [monthReturns]
  );

  const monthNetProfit =
    monthGrossProfit - monthReturnProfitImpact - monthExpenseTotal;

  const todayMargin =
    todayRevenue > 0 ? (todayGrossProfit / todayRevenue) * 100 : 0;

  const monthMargin =
    monthRevenue > 0 ? (monthGrossProfit / monthRevenue) * 100 : 0;

  const averageTicket = useMemo(() => {
    return monthSales.length > 0 ? monthRevenue / monthSales.length : 0;
  }, [monthSales, monthRevenue]);

  const topProfitableProducts = useMemo<ProfitProductRow[]>(() => {
    const map = new Map<number, ProfitProductRow>();

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
        const itemProfit = item.lineTotal - itemCost;

        existing.quantity += item.quantity;
        existing.revenue += item.lineTotal;
        existing.cost += itemCost;
        existing.profit += itemProfit;

        map.set(item.productId, existing);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8);
  }, [monthSales]);

  const topExpenseCategories = useMemo<ExpenseCategoryRow[]>(() => {
    const map = new Map<string, ExpenseCategoryRow>();

    monthExpenses.forEach((expense) => {
      const key = expense.category.trim().toLowerCase();
      const existing = map.get(key) ?? {
        category: expense.category,
        amount: 0,
        count: 0,
      };

      existing.amount += expense.amount;
      existing.count += 1;
      existing.category = expense.category;

      map.set(key, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [monthExpenses]);

  const topReturnReasons = useMemo(() => {
    const map = new Map<
      string,
      {
        reason: string;
        count: number;
        refundAmount: number;
      }
    >();

    monthReturns.forEach((record) => {
      const key = record.reason.trim().toLowerCase();
      const existing = map.get(key) ?? {
        reason: record.reason || "No reason",
        count: 0,
        refundAmount: 0,
      };

      existing.count += 1;
      existing.refundAmount += record.refundAmount;
      existing.reason = record.reason || existing.reason;

      map.set(key, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.refundAmount - a.refundAmount)
      .slice(0, 5);
  }, [monthReturns]);

  const recentSales = useMemo(() => {
    return sales.slice().reverse().slice(0, 10);
  }, [sales]);

  const recentReturns = useMemo(() => {
    return returnsRecords.slice().reverse().slice(0, 10);
  }, [returnsRecords]);

  const topProfitSale = useMemo(() => {
    if (monthSales.length === 0) return null;

    return [...monthSales].sort((a, b) => b.profit - a.profit)[0] ?? null;
  }, [monthSales]);

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Profit Report</h1>
          <p className="text-sm text-slate-500 mt-1">
            Revenue, cost, expenses, returns, and net profit analytics
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
            to="/sales-history"
            className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white"
          >
            Sales History
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
          <div className="text-xs text-slate-500">Today's Cost</div>
          <div className="text-3xl font-bold mt-2">{formatMoney(todayCost)}</div>
          <div className="text-sm text-slate-500 mt-2">Cost of sold items</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Today's Gross Profit</div>
          <div className="text-3xl font-bold mt-2 text-emerald-600">
            {formatMoney(todayGrossProfit)}
          </div>
          <div className="text-sm text-slate-500 mt-2">
            Margin {formatPercent(todayMargin)}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Today's Returns</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {formatMoney(todayReturnRefundTotal)}
          </div>
          <div className="text-sm text-slate-500 mt-2">
            Cost {formatMoney(todayReturnCostTotal)}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Today's Net Profit</div>
          <div className="text-3xl font-bold mt-2">{formatMoney(todayNetProfit)}</div>
          <div className="text-sm text-slate-500 mt-2">
            Gross profit minus returns and expenses
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
          <div className="text-sm text-slate-500 mt-2">
            Margin {formatPercent(monthMargin)}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Month Expenses</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {formatMoney(monthExpenseTotal)}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Month Returns</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {formatMoney(monthReturnRefundTotal)}
          </div>
          <div className="text-sm text-slate-500 mt-2">
            Cost {formatMoney(monthReturnCostTotal)}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Month Net Profit</div>
          <div className="text-3xl font-bold mt-2">{formatMoney(monthNetProfit)}</div>
          <div className="text-sm text-slate-500 mt-2">
            Gross profit minus returns and expenses
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Average Ticket</div>
          <div className="text-3xl font-bold mt-2">{formatMoney(averageTicket)}</div>
          <div className="text-sm text-slate-500 mt-2">Monthly average</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Best Profit Sale</div>
          <div className="text-2xl font-bold mt-2">
            {topProfitSale ? formatMoney(topProfitSale.profit) : "0"}
          </div>
          <div className="text-sm text-slate-500 mt-2">
            {topProfitSale ? topProfitSale.invoiceNumber : "No sales yet"}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Sales Count</div>
          <div className="text-3xl font-bold mt-2">{sales.length}</div>
          <div className="text-sm text-slate-500 mt-2">All invoices</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Returns Count</div>
          <div className="text-3xl font-bold mt-2">{returnsRecords.length}</div>
          <div className="text-sm text-slate-500 mt-2">All return records</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="text-xl font-bold">Top Profitable Products</h2>
            <p className="text-sm text-slate-500 mt-1">
              Based on sales made this month
            </p>
          </div>

          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-4 text-left">Product</th>
                  <th className="p-4 text-left">Qty</th>
                  <th className="p-4 text-left">Revenue</th>
                  <th className="p-4 text-left">Cost</th>
                  <th className="p-4 text-left">Profit</th>
                </tr>
              </thead>

              <tbody>
                {topProfitableProducts.length === 0 ? (
                  <tr>
                    <td className="p-5 text-slate-500" colSpan={5}>
                      No products sold this month
                    </td>
                  </tr>
                ) : (
                  topProfitableProducts.map((row) => (
                    <tr key={row.productId} className="border-t">
                      <td className="p-4">
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-slate-500 mt-1">{row.sku}</div>
                      </td>
                      <td className="p-4">{row.quantity}</td>
                      <td className="p-4">{formatMoney(row.revenue)}</td>
                      <td className="p-4">{formatMoney(row.cost)}</td>
                      <td className="p-4 font-semibold text-emerald-600">
                        {formatMoney(row.profit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="text-xl font-bold">Top Expense Categories</h2>
            <p className="text-sm text-slate-500 mt-1">
              Based on expense records this month
            </p>
          </div>

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
                {topExpenseCategories.length === 0 ? (
                  <tr>
                    <td className="p-5 text-slate-500" colSpan={3}>
                      No expenses recorded this month
                    </td>
                  </tr>
                ) : (
                  topExpenseCategories.map((row) => (
                    <tr key={row.category.toLowerCase()} className="border-t">
                      <td className="p-4">
                        <div className="font-medium">{row.category}</div>
                      </td>
                      <td className="p-4">{row.count}</td>
                      <td className="p-4 font-semibold text-red-600">
                        {formatMoney(row.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="text-xl font-bold">Top Return Reasons</h2>
            <p className="text-sm text-slate-500 mt-1">
              Based on return records this month
            </p>
          </div>

          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-4 text-left">Reason</th>
                  <th className="p-4 text-left">Count</th>
                  <th className="p-4 text-left">Refund</th>
                </tr>
              </thead>

              <tbody>
                {topReturnReasons.length === 0 ? (
                  <tr>
                    <td className="p-5 text-slate-500" colSpan={3}>
                      No returns recorded this month
                    </td>
                  </tr>
                ) : (
                  topReturnReasons.map((row) => (
                    <tr key={row.reason.toLowerCase()} className="border-t">
                      <td className="p-4">
                        <div className="font-medium">{row.reason}</div>
                      </td>
                      <td className="p-4">{row.count}</td>
                      <td className="p-4 font-semibold text-red-600">
                        {formatMoney(row.refundAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="text-xl font-bold">Recent Sales Profit</h2>
            <p className="text-sm text-slate-500 mt-1">
              Latest invoices with gross profit
            </p>
          </div>

          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-4 text-left">Invoice</th>
                  <th className="p-4 text-left">Revenue</th>
                  <th className="p-4 text-left">Cost</th>
                  <th className="p-4 text-left">Profit</th>
                  <th className="p-4 text-left">Date</th>
                </tr>
              </thead>

              <tbody>
                {recentSales.length === 0 ? (
                  <tr>
                    <td className="p-5 text-slate-500" colSpan={5}>
                      No sales yet
                    </td>
                  </tr>
                ) : (
                  recentSales.map((sale) => (
                    <tr key={sale.id} className="border-t">
                      <td className="p-4">
                        <div className="font-medium">{sale.invoiceNumber}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {sale.cashier} • {sale.paymentMethod.toUpperCase()}
                        </div>
                      </td>
                      <td className="p-4">{formatMoney(sale.total)}</td>
                      <td className="p-4">{formatMoney(sale.costTotal)}</td>
                      <td className="p-4 font-semibold text-emerald-600">
                        {formatMoney(sale.profit)}
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {new Date(sale.saleDate).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="text-xl font-bold">Recent Returns</h2>
            <p className="text-sm text-slate-500 mt-1">
              Latest processed refunds and stock reversals
            </p>
          </div>

          <div className="overflow-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-4 text-left">Return</th>
                  <th className="p-4 text-left">Invoice</th>
                  <th className="p-4 text-left">Refund</th>
                  <th className="p-4 text-left">Profit Impact</th>
                  <th className="p-4 text-left">Date</th>
                </tr>
              </thead>

              <tbody>
                {recentReturns.length === 0 ? (
                  <tr>
                    <td className="p-5 text-slate-500" colSpan={5}>
                      No returns yet
                    </td>
                  </tr>
                ) : (
                  recentReturns.map((record) => (
                    <tr key={record.id} className="border-t">
                      <td className="p-4">
                        <div className="font-medium">{record.returnNumber}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {record.reason}
                        </div>
                      </td>
                      <td className="p-4">{record.originalInvoiceNumber}</td>
                      <td className="p-4 font-semibold text-red-600">
                        {formatMoney(record.refundAmount)}
                      </td>
                      <td className="p-4 font-semibold text-red-600">
                        {formatMoney(record.profitImpact)}
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {new Date(record.returnDate).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="text-xl font-bold">Net Profit Summary</h2>
            <p className="text-sm text-slate-500 mt-1">
              Gross profit minus returns and expenses
            </p>
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
          </div>
        </section>
      </div>
    </MainLayout>
  );
}