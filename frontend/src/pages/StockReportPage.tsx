import { useEffect, useMemo, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { getCurrentUser, getRoleLabel } from "../services/authService";
import {
  getInventoryValuationSnapshot,
  syncInventoryValuationCache,
} from "../services/inventoryValuationService";
import {
  downloadJsonFile,
  printCurrentPage,
} from "../services/reportExportService";

import type { InventoryValuationSnapshot } from "../types/InventoryValuation";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export default function StockReportPage() {
  const currentUser = getCurrentUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<InventoryValuationSnapshot | null>(() =>
    getInventoryValuationSnapshot()
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "ok" | "low_stock" | "out_of_stock">("all");
  const [sortBy, setSortBy] = useState<"value" | "qty" | "name">("value");

  async function refresh() {
    try {
      setLoading(true);
      setError("");

      const fresh = await syncInventoryValuationCache();
      setSnapshot(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load inventory valuation");
      setSnapshot(getInventoryValuationSnapshot());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = snapshot?.rows ?? [];

    const matched = rows.filter((row) => {
      const matchesSearch =
        !term ||
        row.sku.toLowerCase().includes(term) ||
        row.barcode.toLowerCase().includes(term) ||
        row.name.toLowerCase().includes(term);

      const matchesFilter = filter === "all" || row.status === filter;

      return matchesSearch && matchesFilter;
    });

    const sorted = [...matched].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "qty") return b.stock - a.stock;
      return b.stockValue - a.stockValue;
    });

    return sorted;
  }, [snapshot, search, filter, sortBy]);

  const summary = snapshot?.summary;

  const cards = [
    { label: "Products", value: summary?.totalProducts ?? 0 },
    { label: "Qty On Hand", value: formatNumber(summary?.totalQty ?? 0) },
    { label: "Inventory Value", value: formatMoney(summary?.totalInventoryValue ?? 0) },
    { label: "Sell Value", value: formatMoney(summary?.totalSellValue ?? 0) },
    { label: "Low Stock", value: summary?.lowStockProducts ?? 0 },
    { label: "Zero Stock", value: summary?.zeroStockProducts ?? 0 },
  ];

  function handleExport() {
    if (!snapshot) return;
    downloadJsonFile("inventory-valuation", snapshot);
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Valuation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Stock on hand, cost value, selling value, and stock risk
          </p>
          {currentUser && (
            <div className="mt-2 text-xs text-slate-400">
              Signed in as {currentUser.name} ({getRoleLabel(currentUser.role)})
            </div>
          )}
        </div>

        <div className="flex gap-3">
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

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">Summary</h2>
          <p className="mt-1 text-sm text-slate-500">
            Inventory cost view and potential selling value
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Average Unit Cost</div>
              <div className="mt-1 text-xl font-bold">
                {formatMoney(summary?.averageUnitCost ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Average Unit Sell</div>
              <div className="mt-1 text-xl font-bold">
                {formatMoney(summary?.averageUnitSell ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Potential Margin</div>
              <div className="mt-1 text-xl font-bold text-emerald-600">
                {formatMoney(summary?.totalPotentialMargin ?? 0)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Inactive Products</div>
              <div className="mt-1 text-xl font-bold text-slate-700">
                {summary?.inactiveProducts ?? 0}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border p-4">
              <div className="text-sm font-semibold">Low Stock</div>
              <div className="mt-2 text-sm text-slate-600">
                {snapshot?.lowStockProducts.length ?? 0} products
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-sm font-semibold">Zero Stock</div>
              <div className="mt-2 text-sm text-slate-600">
                {snapshot?.zeroStockProducts.length ?? 0} products
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Products</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search, filter, and sort valuation rows
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={filter}
                onChange={(e) =>
                  setFilter(e.target.value as "all" | "ok" | "low_stock" | "out_of_stock")
                }
                className="rounded-xl border p-3"
              >
                <option value="all">All</option>
                <option value="ok">OK</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "value" | "qty" | "name")}
                className="rounded-xl border p-3"
              >
                <option value="value">Sort by Value</option>
                <option value="qty">Sort by Qty</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU, barcode, or product name..."
              className="w-full rounded-xl border p-3"
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border">
            {loading && !snapshot ? (
              <div className="p-6 text-slate-500">Loading inventory valuation...</div>
            ) : filteredRows.length === 0 ? (
              <div className="p-6 text-slate-500">No products found</div>
            ) : (
              <div className="max-h-[44rem] overflow-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="p-4 text-left">SKU</th>
                      <th className="p-4 text-left">Product</th>
                      <th className="p-4 text-left">Qty</th>
                      <th className="p-4 text-left">Cost</th>
                      <th className="p-4 text-left">Value</th>
                      <th className="p-4 text-left">Sell Value</th>
                      <th className="p-4 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="p-4 text-sm">{row.sku}</td>
                        <td className="p-4">
                          <div className="font-semibold">{row.name}</div>
                          <div className="text-xs text-slate-500">{row.barcode}</div>
                        </td>
                        <td className="p-4">{row.stock}</td>
                        <td className="p-4">{formatMoney(row.costPrice)}</td>
                        <td className="p-4">{formatMoney(row.stockValue)}</td>
                        <td className="p-4">{formatMoney(row.sellValue)}</td>
                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              row.status === "out_of_stock"
                                ? "bg-red-100 text-red-700"
                                : row.status === "low_stock"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {row.status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">Top Inventory Value</h2>
          <div className="mt-4 space-y-3">
            {(snapshot?.topValueProducts ?? []).slice(0, 10).map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{row.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{row.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatMoney(row.stockValue)}</div>
                    <div className="text-xs text-slate-500">Qty {row.stock}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">Low Stock</h2>
          <div className="mt-4 space-y-3">
            {(snapshot?.lowStockProducts ?? []).slice(0, 10).map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{row.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{row.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{row.stock}</div>
                    <div className="text-xs text-slate-500">Reorder {row.reorderLevel}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold">Zero Stock</h2>
          <div className="mt-4 space-y-3">
            {(snapshot?.zeroStockProducts ?? []).slice(0, 10).map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{row.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{row.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-600">0</div>
                    <div className="text-xs text-slate-500">Out of stock</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}