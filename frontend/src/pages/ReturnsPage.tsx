import { useEffect, useMemo, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { addAuditLog } from "../services/auditService";
import { getCurrentUser } from "../services/authService";
import { getSettings } from "../services/settingsService";
import { fetchSaleByInvoiceNumber, syncSalesCache } from "../services/salesService";
import { syncProductsCache } from "../services/productsApi";
import { syncCashRegisterCache } from "../services/cashRegisterService";
import {
  createReturn,
  getReturns,
  getReturnsBySaleId,
  syncReturnsCache,
} from "../services/returnsService";

import type { Sale } from "../types/Sale";
import type { SalesReturn } from "../types/Return";

function formatMoney(value: number, currencySymbol: string) {
  return `${currencySymbol}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type ReturnQtyMap = Record<number, number>;

export default function ReturnsPage() {
  const currentUser = getCurrentUser();
  const settings = getSettings();

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [sale, setSale] = useState<Sale | null>(null);
  const [returns, setReturns] = useState<SalesReturn[]>(() => getReturns());
  const [returnQtyMap, setReturnQtyMap] = useState<ReturnQtyMap>({});
  const [refundMethod, setRefundMethod] = useState<"cash" | "card">("cash");
  const [reason, setReason] = useState("Customer returned items");
  const [search, setSearch] = useState("");
  const [loadingSale, setLoadingSale] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function refreshReturns() {
    try {
      const fresh = await syncReturnsCache();
      setReturns(fresh);
    } catch {
      setReturns(getReturns());
    }
  }

  useEffect(() => {
    void refreshReturns();
  }, []);

  const currentSaleReturns = useMemo(() => {
    if (!sale) return [];
    return getReturnsBySaleId(sale.id);
  }, [sale, returns]);

  const refundableRows = useMemo(() => {
    if (!sale) return [];

    const returnedByProduct = new Map<number, number>();
    for (const ret of currentSaleReturns) {
      for (const item of ret.items) {
        returnedByProduct.set(
          item.productId,
          (returnedByProduct.get(item.productId) ?? 0) + item.quantity
        );
      }
    }

    return sale.items.map((item) => {
      const alreadyReturned = returnedByProduct.get(item.productId) ?? 0;
      const available = Math.max(0, item.quantity - alreadyReturned);
      const selected = returnQtyMap[item.productId] ?? 0;

      return {
        ...item,
        alreadyReturned,
        available,
        selected,
      };
    });
  }, [sale, currentSaleReturns, returnQtyMap]);

  const refundSubtotal = useMemo(() => {
    return refundableRows.reduce(
      (sum, row) => sum + row.selected * row.unitPrice,
      0
    );
  }, [refundableRows]);

  const filteredReturns = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return returns;
    }

    return returns.filter((item) => {
      return (
        item.returnNumber.toLowerCase().includes(term) ||
        item.invoiceNumber.toLowerCase().includes(term) ||
        item.cashier.toLowerCase().includes(term) ||
        item.reason.toLowerCase().includes(term) ||
        item.refundMethod.toLowerCase().includes(term) ||
        item.items.some(
          (line) =>
            line.name.toLowerCase().includes(term) ||
            line.sku.toLowerCase().includes(term)
        )
      );
    });
  }, [returns, search]);

  const stats = useMemo(() => {
    const returnsCount = returns.length;
    const totalRefunds = returns.reduce((sum, item) => sum + item.refundAmount, 0);
    const cashRefunds = returns.filter((item) => item.refundMethod === "cash").length;

    return { returnsCount, totalRefunds, cashRefunds };
  }, [returns]);

  async function loadSale() {
    const trimmed = invoiceNumber.trim();

    if (!trimmed) {
      setError("Enter an invoice number");
      return;
    }

    try {
      setLoadingSale(true);
      setError("");

      const fetched = await fetchSaleByInvoiceNumber(trimmed);
      setSale(fetched);
      setReason(`Return for ${fetched.invoiceNumber}`);
      setRefundMethod("cash");

      const initialQty: ReturnQtyMap = {};
      for (const item of fetched.items) {
        initialQty[item.productId] = 0;
      }
      setReturnQtyMap(initialQty);
    } catch (err) {
      setSale(null);
      setError(err instanceof Error ? err.message : "Unable to load invoice");
    } finally {
      setLoadingSale(false);
    }
  }

  function setRowQty(productId: number, value: number, max: number) {
    const nextValue = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0));
    setReturnQtyMap((current) => ({
      ...current,
      [productId]: nextValue,
    }));
  }

  function setAllRemaining() {
    if (!sale) return;

    const next: ReturnQtyMap = {};
    for (const row of refundableRows) {
      next[row.productId] = row.available;
    }
    setReturnQtyMap(next);
  }

  function clearSelected() {
    if (!sale) return;

    const next: ReturnQtyMap = {};
    for (const row of refundableRows) {
      next[row.productId] = 0;
    }
    setReturnQtyMap(next);
  }

  async function handleCreateReturn() {
    if (!sale) {
      setError("Load a sale first");
      return;
    }

    const items = refundableRows
      .filter((row) => row.selected > 0)
      .map((row) => ({
        productId: row.productId,
        sku: row.sku,
        name: row.name,
        quantity: row.selected,
        unitPrice: row.unitPrice,
        refundTotal: row.selected * row.unitPrice,
      }));

    if (items.length === 0) {
      setError("Select at least one item to return");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const returnNumber = `RET-${Date.now().toString().slice(-6)}`;

      const saved = await createReturn({
        returnNumber,
        returnDate: new Date().toISOString(),
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        cashier: currentUser?.name ?? sale.cashier,
        reason,
        refundMethod,
        subtotal: refundSubtotal,
        refundAmount: refundSubtotal,
        items,
      });

      addAuditLog(
        "SALE_RETURN_CREATED",
        `Return ${saved.returnNumber} against ${sale.invoiceNumber}`,
        currentUser?.name ?? "Cashier"
      );

      await Promise.allSettled([
        syncReturnsCache(),
        syncProductsCache(),
        syncSalesCache(),
        syncCashRegisterCache(),
      ]);

      setReturns(getReturns());
      setSale(null);
      setInvoiceNumber("");
      setReturnQtyMap({});
      setReason("Customer returned items");
      setRefundMethod("cash");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create return");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Returns</h1>
          <p className="text-sm text-slate-500 mt-1">
            Load an invoice, choose quantities, and create a return
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Returns</div>
            <div className="mt-1 text-2xl font-bold">{stats.returnsCount}</div>
          </div>

          <div className="rounded-2xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Refunds</div>
            <div className="mt-1 text-2xl font-bold">
              {formatMoney(stats.totalRefunds, settings.currencySymbol)}
            </div>
          </div>

          <div className="rounded-2xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Cash Returns</div>
            <div className="mt-1 text-2xl font-bold">{stats.cashRefunds}</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full rounded-xl border p-3"
                  placeholder="INV-123456"
                />
              </div>

              <button
                onClick={loadSale}
                disabled={loadingSale}
                className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-60"
              >
                {loadingSale ? "Loading..." : "Load Sale"}
              </button>
            </div>
          </div>

          {!sale ? (
            <div className="rounded-2xl bg-white p-6 shadow text-slate-500">
              Load a sale to start a return.
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-6 shadow">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{sale.invoiceNumber}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {sale.cashier} • {formatDate(sale.saleDate)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Original Total: {formatMoney(sale.total, settings.currencySymbol)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
                  <div className="text-slate-500">Return Subtotal</div>
                  <div className="mt-1 text-xl font-bold">
                    {formatMoney(refundSubtotal, settings.currencySymbol)}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">Reason</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-xl border p-3"
                    placeholder="Reason for return"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Refund Method
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as "cash" | "card")}
                    className="w-full rounded-xl border p-3"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                <div className="flex items-end gap-3">
                  <button
                    onClick={setAllRemaining}
                    className="rounded-xl border px-4 py-3 font-semibold"
                  >
                    Max Remaining
                  </button>

                  <button
                    onClick={clearSelected}
                    className="rounded-xl border px-4 py-3 font-semibold"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-4 text-left">Item</th>
                      <th className="p-4 text-left">Sold</th>
                      <th className="p-4 text-left">Returned</th>
                      <th className="p-4 text-left">Remaining</th>
                      <th className="p-4 text-left">Qty to Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundableRows.map((row) => (
                      <tr key={row.productId} className="border-t">
                        <td className="p-4">
                          <div className="font-semibold">{row.name}</div>
                          <div className="text-xs text-slate-500">
                            {row.sku}
                          </div>
                        </td>
                        <td className="p-4">{row.quantity}</td>
                        <td className="p-4">{row.alreadyReturned}</td>
                        <td className="p-4 font-semibold">{row.available}</td>
                        <td className="p-4">
                          <input
                            type="number"
                            min={0}
                            max={row.available}
                            value={row.selected}
                            onChange={(e) =>
                              setRowQty(row.productId, Number(e.target.value), row.available)
                            }
                            className="w-28 rounded-xl border p-3"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">
                  Return amount will be posted as{" "}
                  <span className="font-semibold">{refundMethod.toUpperCase()}</span>.
                </div>

                <button
                  onClick={handleCreateReturn}
                  disabled={saving}
                  className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Creating..." : "Create Return"}
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Recent Returns</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search and review return history
                </p>
              </div>

              <span className="text-xs text-slate-500">
                {filteredReturns.length} records
              </span>
            </div>

            <div className="mt-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border p-3"
                placeholder="Search return number, invoice, SKU, or reason..."
              />
            </div>

            <div className="mt-5 max-h-[44rem] space-y-3 overflow-auto pr-1">
              {filteredReturns.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-slate-500">
                  No returns found
                </div>
              ) : (
                filteredReturns.map((ret) => (
                  <div key={ret.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{ret.returnNumber}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Invoice {ret.invoiceNumber}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {ret.cashier} • {formatDate(ret.returnDate)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold">
                          {formatMoney(ret.refundAmount, settings.currencySymbol)}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {ret.refundMethod.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-slate-600">{ret.reason}</div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {ret.items.map((item) => (
                        <span
                          key={`${ret.id}-${item.productId}-${item.sku}`}
                          className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                        >
                          {item.sku} × {item.quantity}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </MainLayout>
  );
}