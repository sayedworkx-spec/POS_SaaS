import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import { getSales, syncSalesCache } from "../services/salesService";

import type { Sale } from "../types/Sale";

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

function formatShortDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SalesHistoryPage() {
  const [search, setSearch] = useState("");
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState("");
  const [sales, setSales] = useState<Sale[]>(() => getSales());

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const fresh = await syncSalesCache();
        if (active) {
          setSales(fresh);
        }
      } catch {
        if (active) {
          setSales(getSales());
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const invoices = useMemo(() => {
    return sales.slice().reverse();
  }, [sales]);

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return invoices;
    }

    return invoices.filter((invoice) => {
      const itemMatch = invoice.items.some(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.sku.toLowerCase().includes(term)
      );

      return (
        invoice.invoiceNumber.toLowerCase().includes(term) ||
        invoice.cashier.toLowerCase().includes(term) ||
        invoice.paymentMethod.toLowerCase().includes(term) ||
        String(invoice.shiftId).includes(term) ||
        itemMatch
      );
    });
  }, [invoices, search]);

  useEffect(() => {
    if (filteredInvoices.length === 0) {
      setSelectedInvoiceNumber("");
      return;
    }

    const currentExists = filteredInvoices.some(
      (invoice) => invoice.invoiceNumber === selectedInvoiceNumber
    );

    if (!currentExists) {
      setSelectedInvoiceNumber(filteredInvoices[0].invoiceNumber);
    }
  }, [filteredInvoices, selectedInvoiceNumber]);

  const selectedInvoice: Sale | null =
    filteredInvoices.find(
      (invoice) => invoice.invoiceNumber === selectedInvoiceNumber
    ) ?? null;

  return (
    <MainLayout>
      <div className="print:hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Sales History</h1>
            <p className="text-sm text-slate-500 mt-1">
              Invoice details and receipt reprint
            </p>
          </div>

          <div className="w-full lg:w-96">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice, cashier, SKU, or item name..."
              className="w-full border rounded-xl p-3"
            />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between gap-3">
              <h2 className="font-bold text-lg">Invoices</h2>
              <span className="text-xs text-slate-500">
                {filteredInvoices.length} records
              </span>
            </div>

            <div className="max-h-[72vh] overflow-auto">
              {filteredInvoices.length === 0 ? (
                <div className="p-6 text-slate-500">No invoices found</div>
              ) : (
                filteredInvoices.map((invoice) => {
                  const isSelected =
                    selectedInvoiceNumber === invoice.invoiceNumber;

                  return (
                    <button
                      key={invoice.id}
                      onClick={() => setSelectedInvoiceNumber(invoice.invoiceNumber)}
                      className={`w-full text-left p-4 border-b hover:bg-slate-50 transition ${
                        isSelected ? "bg-slate-100" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">
                            {invoice.invoiceNumber}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {invoice.cashier} • {formatShortDate(invoice.saleDate)}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {invoice.paymentMethod.toUpperCase()} • Shift #
                            {String(invoice.shiftId).slice(-6)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-semibold">
                            {formatMoney(invoice.total)}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Profit {formatMoney(invoice.profit)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-6">
            {!selectedInvoice ? (
              <div className="text-slate-500">
                Select an invoice to view details.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedInvoice.invoiceNumber}
                    </h2>
                    <div className="text-sm text-slate-500 mt-1">
                      {formatDate(selectedInvoice.saleDate)}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      Cashier: {selectedInvoice.cashier} • Payment:{" "}
                      {selectedInvoice.paymentMethod.toUpperCase()} • Shift #{" "}
                      {String(selectedInvoice.shiftId).slice(-6)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      to={`/receipt/${selectedInvoice.invoiceNumber}`}
                      target="_blank"
                      className="rounded-xl bg-slate-900 px-4 py-2 text-white text-sm font-medium"
                    >
                      Reprint Receipt
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4 mb-6">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Items</div>
                    <div className="font-semibold mt-1">
                      {selectedInvoice.items.length}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Subtotal</div>
                    <div className="font-semibold mt-1">
                      {formatMoney(selectedInvoice.subtotal)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Discount</div>
                    <div className="font-semibold mt-1">
                      -{formatMoney(selectedInvoice.discountAmount)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Total</div>
                    <div className="font-semibold mt-1">
                      {formatMoney(selectedInvoice.total)}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3 mb-6">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Cost</div>
                    <div className="font-semibold mt-1">
                      {formatMoney(selectedInvoice.costTotal)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Profit</div>
                    <div className="font-semibold mt-1 text-emerald-600">
                      {formatMoney(selectedInvoice.profit)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Cash Received</div>
                    <div className="font-semibold mt-1">
                      {formatMoney(selectedInvoice.cashReceived)}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border overflow-hidden mb-6">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-4 text-left">Item</th>
                        <th className="p-4 text-left">SKU</th>
                        <th className="p-4 text-left">Qty</th>
                        <th className="p-4 text-left">Unit Price</th>
                        <th className="p-4 text-left">Cost</th>
                        <th className="p-4 text-left">Line Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedInvoice.items.map((item) => (
                        <tr
                          key={`${selectedInvoice.id}-${item.productId}-${item.sku}`}
                          className="border-t"
                        >
                          <td className="p-4">{item.name}</td>
                          <td className="p-4">{item.sku}</td>
                          <td className="p-4">{item.quantity}</td>
                          <td className="p-4">{formatMoney(item.unitPrice)}</td>
                          <td className="p-4">{formatMoney(item.costTotal)}</td>
                          <td className="p-4 font-semibold">
                            {formatMoney(item.lineTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatMoney(selectedInvoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span>Discount</span>
                      <span>-{formatMoney(selectedInvoice.discountAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span>Cost</span>
                      <span>{formatMoney(selectedInvoice.costTotal)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold mt-3 border-t pt-3">
                      <span>Total</span>
                      <span>{formatMoney(selectedInvoice.total)}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex justify-between text-sm">
                      <span>Cash Received</span>
                      <span>{formatMoney(selectedInvoice.cashReceived)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span>Change</span>
                      <span>{formatMoney(selectedInvoice.change)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span>Profit</span>
                      <span className="text-emerald-600">
                        {formatMoney(selectedInvoice.profit)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </MainLayout>
  );
}