import { useEffect, useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import { getSales } from "../services/salesService";
import { getSettings } from "../services/settingsService";

import type { Sale } from "../types/Sale";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ReceiptPage() {
  const { invoiceNumber = "" } = useParams();
  const [searchParams] = useSearchParams();

  const sale: Sale | null = useMemo(() => {
    return getSales().find((item) => item.invoiceNumber === invoiceNumber) ?? null;
  }, [invoiceNumber]);

  const settings = useMemo(() => getSettings(), []);

  const formatMoney = (value: number) =>
    `${settings.currencySymbol}${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(value)}`;

  useEffect(() => {
    if (!sale) return;

    const shouldAutoPrint =
      settings.autoPrintReceipt || searchParams.get("print") === "1";

    if (shouldAutoPrint) {
      const timer = setTimeout(() => window.print(), 350);
      return () => clearTimeout(timer);
    }
  }, [sale, settings.autoPrintReceipt, searchParams]);

  if (!sale) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">Receipt not found</h1>
          <p className="mt-2 text-sm text-slate-500">
            The invoice number does not exist.
          </p>

          <div className="mt-6">
            <Link
              to="/sales-history"
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
            >
              Back to Sales History
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const showCost = settings.showCostOnReceipt;
  const grossProfit = sale.total - sale.costTotal;

  return (
    <MainLayout>
      <div className="print:hidden mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Receipt</h1>
          <p className="text-sm text-slate-500 mt-1">
            {sale.invoiceNumber} • {sale.cashier}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
          >
            Print
          </button>

          <Link
            to={`/receipt/${sale.invoiceNumber}?print=1`}
            className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white"
          >
            Auto Print
          </Link>

          <Link
            to="/sales-history"
            className="rounded-xl border px-4 py-3 text-sm font-medium"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow print:shadow-none print:p-0">
        <div className="mx-auto w-full max-w-[80mm] font-mono text-[12px] leading-5 print:max-w-[80mm]">
          <div className="text-center">
            <div className="text-lg font-bold">{settings.storeName}</div>
            <div className="text-xs">Sales Receipt</div>
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <div className="text-xs">
            <div>Invoice: {sale.invoiceNumber}</div>
            <div>Date: {formatDate(sale.saleDate)}</div>
            <div>Cashier: {sale.cashier}</div>
            <div>Payment: {sale.paymentMethod.toUpperCase()}</div>
            <div>Shift: #{String(sale.shiftId).slice(-6)}</div>
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <div className="space-y-1">
            {sale.items.map((item) => (
              <div key={`${sale.id}-${item.productId}-${item.sku}`} className="flex justify-between gap-3">
                <span className="pr-2">
                  {item.name} x{item.quantity}
                </span>
                <span>{formatMoney(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatMoney(sale.subtotal)}</span>
            </div>

            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{formatMoney(sale.discountAmount)}</span>
            </div>

            <div className="flex justify-between">
              <span>VAT</span>
              <span>{formatMoney(Math.round((sale.total * settings.vatRate) / 100))}</span>
            </div>

            {showCost && (
              <>
                <div className="flex justify-between">
                  <span>Cost</span>
                  <span>{formatMoney(sale.costTotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Profit</span>
                  <span>{formatMoney(grossProfit)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>{formatMoney(sale.total)}</span>
            </div>

            <div className="flex justify-between">
              <span>Cash Received</span>
              <span>{formatMoney(sale.cashReceived)}</span>
            </div>

            <div className="flex justify-between">
              <span>Change</span>
              <span>{formatMoney(sale.change)}</span>
            </div>
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <div className="text-center text-xs">
            {settings.receiptFooter}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}