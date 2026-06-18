import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import { addAuditLog } from "../services/auditService";
import { getCurrentUser } from "../services/authService";
import {
  clearSuspendedSales,
  deleteSuspendedSale,
  getSuspendedSales,
  queueRestoreSuspendedSale,
} from "../services/suspendedSaleService";

import type { SuspendedSale } from "../types/SuspendedSale";

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

export default function SuspendedSalesPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState("");

  const suspendedSales = useMemo(() => getSuspendedSales(), [version]);

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return suspendedSales;

    return suspendedSales.filter((sale) => {
      const itemsMatch = sale.items.some(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.sku.toLowerCase().includes(term)
      );

      return (
        sale.reference.toLowerCase().includes(term) ||
        sale.cashier.toLowerCase().includes(term) ||
        sale.reason.toLowerCase().includes(term) ||
        sale.paymentMethod.toLowerCase().includes(term) ||
        itemsMatch
      );
    });
  }, [suspendedSales, search]);

  const totalAmount = useMemo(() => {
    return filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  }, [filteredSales]);

  const totalItems = useMemo(() => {
    return filteredSales.reduce(
      (sum, sale) =>
        sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );
  }, [filteredSales]);

  function refresh() {
    setVersion((current) => current + 1);
  }

  function handleRestore(sale: SuspendedSale) {
    queueRestoreSuspendedSale(sale);

    addAuditLog(
      "SALE_RESTORED",
      `Restored held sale ${sale.reference}`,
      currentUser?.name ?? "Cashier"
    );

    navigate("/sales");
  }

  function handleDelete(id: number, reference: string) {
    const ok = window.confirm(`Delete held sale ${reference}?`);
    if (!ok) return;

    deleteSuspendedSale(id);

    addAuditLog(
      "SALE_HOLD_DELETED",
      `Deleted held sale ${reference}`,
      currentUser?.name ?? "Cashier"
    );

    refresh();
  }

  function handleClearAll() {
    const ok = window.confirm("Clear all held sales?");
    if (!ok) return;

    clearSuspendedSales();

    addAuditLog(
      "SALE_HOLD_CLEARED",
      "Cleared all held sales",
      currentUser?.name ?? "Cashier"
    );

    refresh();
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Held Sales</h1>
          <p className="text-sm text-slate-500 mt-1">
            Restore suspended carts and continue checkout later
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Held Orders</div>
            <div className="text-2xl font-bold mt-1">{filteredSales.length}</div>
          </div>

          <div className="rounded-xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Items</div>
            <div className="text-2xl font-bold mt-1">{totalItems}</div>
          </div>

          <div className="rounded-xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Total Value</div>
            <div className="text-2xl font-bold mt-1">{formatMoney(totalAmount)}</div>
          </div>

          <button
            onClick={handleClearAll}
            className="rounded-xl bg-red-600 px-4 py-3 font-medium text-white"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="mb-6 w-full max-w-xl">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by reference, cashier, reason, SKU, or item name..."
          className="w-full rounded-xl border bg-white p-3 shadow"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredSales.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow text-slate-500">
            No held sales found
          </div>
        ) : (
          filteredSales.map((sale) => (
            <div key={sale.id} className="rounded-2xl bg-white p-5 shadow">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold">{sale.reference}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    {sale.cashier} • {formatDate(sale.createdAt)}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {sale.reason}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold">
                    {formatMoney(sale.total)}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {sale.paymentMethod.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <div className="mb-2 text-sm font-semibold">Items</div>
                <div className="space-y-2">
                  {sale.items.map((item) => (
                    <div
                      key={`${sale.id}-${item.productId}-${item.sku}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-slate-500">
                          {item.sku} × {item.quantity}
                        </div>
                      </div>
                      <div className="font-semibold">
                        {formatMoney(item.lineTotal)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Subtotal</div>
                  <div className="font-semibold mt-1">
                    {formatMoney(sale.subtotal)}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Discount</div>
                  <div className="font-semibold mt-1">
                    -{formatMoney(sale.discountAmount)}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Total</div>
                  <div className="font-semibold mt-1">
                    {formatMoney(sale.total)}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => handleRestore(sale)}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
                >
                  Restore
                </button>

                <button
                  onClick={() => handleDelete(sale.id, sale.reference)}
                  className="rounded-xl border px-4 py-3 text-sm font-medium text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </MainLayout>
  );
}