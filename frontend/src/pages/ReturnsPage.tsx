import { useEffect, useMemo, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { getCurrentUser } from "../services/authService";
import { getSales } from "../services/salesService";
import {
  createReturn,
  getReturnableQuantityForItem,
  getReturns,
} from "../services/returnService";

import type { Sale } from "../types/Sale";
import type { SaleReturn } from "../types/Return";

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

export default function ReturnsPage() {
  const currentUser = getCurrentUser();

  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState("");
  const [reason, setReason] = useState("");
  const [returnQtyByProductId, setReturnQtyByProductId] = useState<
    Record<number, number>
  >({});
  const [message, setMessage] = useState("");

  const sales = useMemo(() => getSales().slice().reverse(), [version]);
  const returns = useMemo(() => getReturns().slice().reverse(), [version]);

  const filteredSales = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return sales;
    }

    return sales.filter((sale) => {
      const itemMatch = sale.items.some(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.sku.toLowerCase().includes(term)
      );

      return (
        sale.invoiceNumber.toLowerCase().includes(term) ||
        sale.cashier.toLowerCase().includes(term) ||
        sale.paymentMethod.toLowerCase().includes(term) ||
        itemMatch
      );
    });
  }, [sales, search]);

  useEffect(() => {
    if (filteredSales.length === 0) {
      setSelectedInvoiceNumber("");
      return;
    }

    const currentExists = filteredSales.some(
      (sale) => sale.invoiceNumber === selectedInvoiceNumber
    );

    if (!currentExists) {
      setSelectedInvoiceNumber(filteredSales[0].invoiceNumber);
    }
  }, [filteredSales, selectedInvoiceNumber]);

  const selectedSale: Sale | null =
    filteredSales.find((sale) => sale.invoiceNumber === selectedInvoiceNumber) ??
    null;

  useEffect(() => {
    if (!selectedSale) {
      setReturnQtyByProductId({});
      return;
    }

    const next: Record<number, number> = {};

    selectedSale.items.forEach((item) => {
      next[item.productId] = getReturnableQuantityForItem(
        selectedSale,
        item.productId
      );
    });

    setReturnQtyByProductId(next);
    setReason("");
    setMessage("");
  }, [selectedSale?.invoiceNumber]);

  const totalReturnable = useMemo(() => {
    if (!selectedSale) return 0;

    return selectedSale.items.reduce(
      (sum, item) =>
        sum + getReturnableQuantityForItem(selectedSale, item.productId),
      0
    );
  }, [selectedSale]);

  const refundAmount = useMemo(() => {
    if (!selectedSale) return 0;

    return selectedSale.items.reduce((sum, item) => {
      const qty = Number(returnQtyByProductId[item.productId] ?? 0);
      return sum + item.unitPrice * Math.max(0, qty);
    }, 0);
  }, [selectedSale, returnQtyByProductId]);

  const costAmount = useMemo(() => {
    if (!selectedSale) return 0;

    return selectedSale.items.reduce((sum, item) => {
      const qty = Number(returnQtyByProductId[item.productId] ?? 0);
      return sum + item.costPrice * Math.max(0, qty);
    }, 0);
  }, [selectedSale, returnQtyByProductId]);

  const profitImpact = refundAmount - costAmount;

  const todayReturns = useMemo(() => {
    const today = new Date().toDateString();

    return returns.filter(
      (record) => new Date(record.returnDate).toDateString() === today
    );
  }, [returns]);

  const monthReturns = useMemo(() => {
    const now = new Date();

    return returns.filter((record) => {
      const date = new Date(record.returnDate);
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    });
  }, [returns]);

  const todayRefundTotal = useMemo(
    () => todayReturns.reduce((sum, item) => sum + item.refundAmount, 0),
    [todayReturns]
  );

  const monthRefundTotal = useMemo(
    () => monthReturns.reduce((sum, item) => sum + item.refundAmount, 0),
    [monthReturns]
  );

  function refresh() {
    setVersion((current) => current + 1);
  }

  function setAllReturnQuantitiesToMax() {
    if (!selectedSale) return;

    const next: Record<number, number> = {};

    selectedSale.items.forEach((item) => {
      next[item.productId] = getReturnableQuantityForItem(
        selectedSale,
        item.productId
      );
    });

    setReturnQtyByProductId(next);
  }

  function clearReturnQuantities() {
    if (!selectedSale) return;

    const next: Record<number, number> = {};

    selectedSale.items.forEach((item) => {
      next[item.productId] = 0;
    });

    setReturnQtyByProductId(next);
  }

  function handleProcessReturn() {
    if (!selectedSale) {
      alert("Select a sale first");
      return;
    }

    try {
      const items = selectedSale.items
        .map((item) => ({
          productId: item.productId,
          quantity: Number(returnQtyByProductId[item.productId] ?? 0),
        }))
        .filter((item) => item.quantity > 0);

      const result = createReturn({
        originalInvoiceNumber: selectedSale.invoiceNumber,
        reason,
        createdBy: currentUser?.name ?? "Admin",
        items,
      });

      setMessage(`Return processed: ${result.returnNumber}`);
      refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to process return");
    }
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Returns / Refunds</h1>
          <p className="text-sm text-slate-500 mt-1">
            Reverse stock and record refund against an invoice
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow px-4 py-3">
            <div className="text-xs text-slate-500">Today Refunds</div>
            <div className="text-2xl font-bold mt-1 text-red-600">
              {formatMoney(todayRefundTotal)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow px-4 py-3">
            <div className="text-xs text-slate-500">Month Refunds</div>
            <div className="text-2xl font-bold mt-1 text-red-600">
              {formatMoney(monthRefundTotal)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice, cashier, SKU, or item name..."
              className="w-full border rounded-xl p-3"
            />
          </div>

          <div className="max-h-[78vh] overflow-auto">
            {filteredSales.length === 0 ? (
              <div className="p-6 text-slate-500">No sales found</div>
            ) : (
              filteredSales.map((sale) => {
                const isSelected =
                  selectedInvoiceNumber === sale.invoiceNumber;

                return (
                  <button
                    key={sale.id}
                    onClick={() => setSelectedInvoiceNumber(sale.invoiceNumber)}
                    className={`w-full text-left p-4 border-b hover:bg-slate-50 transition ${
                      isSelected ? "bg-slate-100" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          {sale.invoiceNumber}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {sale.cashier} • {formatDate(sale.saleDate)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {sale.paymentMethod.toUpperCase()} •{" "}
                          {sale.items.length} items
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold">
                          {formatMoney(sale.total)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Profit {formatMoney(sale.profit)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="bg-white rounded-2xl shadow p-6">
            {!selectedSale ? (
              <div className="text-slate-500">
                Select a sale to process a return.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedSale.invoiceNumber}
                    </h2>
                    <div className="text-sm text-slate-500 mt-1">
                      {formatDate(selectedSale.saleDate)}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      Cashier: {selectedSale.cashier} • Payment:{" "}
                      {selectedSale.paymentMethod.toUpperCase()}
                    </div>
                  </div>

                  <div className="text-sm text-slate-500">
                    Returnable items: {totalReturnable}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-5">
                  <button
                    type="button"
                    onClick={setAllReturnQuantitiesToMax}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                  >
                    Full Return
                  </button>

                  <button
                    type="button"
                    onClick={clearReturnQuantities}
                    className="rounded-xl border px-4 py-2 text-sm font-medium"
                  >
                    Clear
                  </button>
                </div>

                <div className="space-y-3 mb-6">
                  {selectedSale.items.map((item) => {
                    const available = getReturnableQuantityForItem(
                      selectedSale,
                      item.productId
                    );

                    return (
                      <div
                        key={`${selectedSale.id}-${item.productId}`}
                        className="rounded-xl border p-4"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {item.sku} • Sold {item.quantity} • Available{" "}
                              {available}
                            </div>
                          </div>

                          <div className="text-right text-sm text-slate-500">
                            {formatMoney(item.unitPrice)} / unit
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
                          <div>
                            <label className="block text-sm font-medium mb-2">
                              Return Qty
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={available}
                              value={returnQtyByProductId[item.productId] ?? 0}
                              onChange={(e) =>
                                setReturnQtyByProductId((current) => ({
                                  ...current,
                                  [item.productId]: Math.min(
                                    available,
                                    Math.max(0, Number(e.target.value))
                                  ),
                                }))
                              }
                              className="w-full border rounded-xl p-3"
                            />
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <div className="text-xs text-slate-500">Refund</div>
                            <div className="font-semibold mt-1">
                              {formatMoney(
                                item.unitPrice *
                                  (returnQtyByProductId[item.productId] ?? 0)
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                  <div className="flex justify-between text-sm">
                    <span>Refund Amount</span>
                    <span>{formatMoney(refundAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Cost Impact</span>
                    <span>{formatMoney(costAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Profit Impact</span>
                    <span className="text-red-600">
                      {formatMoney(profitImpact)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Return Reason
                    </label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full border rounded-xl p-3"
                      placeholder="Damaged item, customer changed mind, wrong item..."
                    />
                  </div>

                  <button
                    onClick={handleProcessReturn}
                    className="w-full rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700"
                  >
                    Process Return
                  </button>

                  {message && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                      {message}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="p-5 border-b">
              <h2 className="text-xl font-bold">Recent Returns</h2>
              <p className="text-sm text-slate-500 mt-1">
                Latest processed refunds and stock reversals
              </p>
            </div>

            <div className="max-h-[24rem] overflow-auto">
              {returns.length === 0 ? (
                <div className="p-6 text-slate-500">No returns yet</div>
              ) : (
                returns.map((record: SaleReturn) => (
                  <div key={record.id} className="border-b p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          {record.returnNumber}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Invoice {record.originalInvoiceNumber} •{" "}
                          {record.paymentMethod.toUpperCase()}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {record.reason}
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
                          Profit {formatMoney(record.profitImpact)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}