import { useMemo, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { getProducts } from "../services/productService";
import { getCategories } from "../services/categoryService";

import type { Product } from "../types/Product";

type LabelItem = {
  product: Product;
  quantity: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function BarcodeBars({ value }: { value: string | undefined | null }) {
  const seed = String(value ?? "").trim() || "000000";
  const bits: number[] = [];

  for (let i = 0; i < seed.length; i += 1) {
    const code = seed.charCodeAt(i);

    for (let bit = 7; bit >= 0; bit -= 1) {
      bits.push((code >> bit) & 1);
    }
  }

  while (bits.length < 64) {
    bits.push(...bits);
  }

  const bars = bits.slice(0, 64);

  return (
    <div className="flex items-end gap-[1px] h-12 w-full overflow-hidden">
      {bars.map((bit, index) => (
        <div
          key={`${seed}-${index}`}
          className="bg-black"
          style={{
            width: bit ? "3px" : "1px",
            height: bit ? "100%" : "70%",
            opacity: index % 7 === 0 ? 1 : 0.92,
          }}
        />
      ))}
    </div>
  );
}

export default function BarcodeLabelsPage() {
  const [products, setProducts] = useState<Product[]>(() => getProducts());
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [labels, setLabels] = useState<Record<number, number>>({});

  const categories = useMemo(() => getCategories(), []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.sku.toLowerCase().includes(term) ||
        product.barcode.toLowerCase().includes(term) ||
        product.name.toLowerCase().includes(term);

      const matchesCategory =
        selectedCategory === "all" ||
        product.categoryId === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const printItems = useMemo<LabelItem[]>(() => {
    return filteredProducts
      .map((product) => ({
        product,
        quantity: Math.max(0, Number(labels[product.id] ?? 1)),
      }))
      .filter((item) => item.quantity > 0);
  }, [filteredProducts, labels]);

  const totalLabels = useMemo(() => {
    return printItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [printItems]);

  const totalProducts = filteredProducts.length;

  function refreshProducts() {
    setProducts(getProducts());
  }

  function handleQuantityChange(productId: number, value: number) {
    setLabels((current) => ({
      ...current,
      [productId]: Math.max(0, value),
    }));
  }

  function setAllQuantities(value: number) {
    const next: Record<number, number> = {};

    filteredProducts.forEach((product) => {
      next[product.id] = Math.max(0, value);
    });

    setLabels(next);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold">Barcode Labels</h1>
          <p className="text-sm text-slate-500 mt-1">
            Print barcode labels for active products
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setAllQuantities(1)}
            className="rounded-xl border px-4 py-3 font-medium bg-white"
          >
            Set All = 1
          </button>

          <button
            onClick={() => setAllQuantities(0)}
            className="rounded-xl border px-4 py-3 font-medium bg-white"
          >
            Clear All
          </button>

          <button
            onClick={handlePrint}
            className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white"
          >
            Print Labels
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6 print:hidden">
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="text-xs text-slate-500">Products</div>
          <div className="text-2xl font-bold mt-2">{totalProducts}</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <div className="text-xs text-slate-500">Labels To Print</div>
          <div className="text-2xl font-bold mt-2">{totalLabels}</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <div className="text-xs text-slate-500">Tip</div>
          <div className="text-sm text-slate-600 mt-2">
            Use this sheet to print SKU / barcode stickers for shelves and items.
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 mb-6 print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU, barcode, or product name..."
              className="w-full border rounded-xl p-3"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-full text-sm font-medium border ${
                selectedCategory === "all"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-300"
              }`}
            >
              All
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium border ${
                  selectedCategory === category.id
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 print:hidden">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="text-xs text-slate-500">{product.sku}</div>
                <div className="font-semibold">{product.name}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {product.barcode}
                </div>
              </div>

              <div className="text-right text-sm text-slate-500">
                {formatMoney(product.sellPrice)}
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-2">
                Copies to print
              </label>

              <input
                type="number"
                min={0}
                value={labels[product.id] ?? 1}
                onChange={(e) =>
                  handleQuantityChange(product.id, Number(e.target.value))
                }
                className="w-32 border rounded-xl p-3"
              />
            </div>

            <div className="rounded-xl border bg-slate-50 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">
                Preview
              </div>

              <div className="rounded-lg bg-white p-3">
                <div className="text-xs text-slate-500">{product.sku}</div>
                <div className="text-sm font-semibold">{product.name}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {product.barcode}
                </div>

                <div className="my-2">
                  <BarcodeBars value={product.barcode} />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span>Price</span>
                  <span className="font-semibold">
                    {formatMoney(product.sellPrice)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden print:block">
        <div className="grid grid-cols-2 gap-3">
          {printItems.flatMap((item) =>
            Array.from({ length: item.quantity }).map((_, index) => (
              <div
                key={`${item.product.id}-${item.product.barcode}-${index}`}
                className="border border-black rounded-md p-2 break-inside-avoid"
                style={{
                  width: "38mm",
                  height: "25mm",
                  overflow: "hidden",
                }}
              >
                <div className="text-[7px] font-bold leading-tight">
                  {item.product.name}
                </div>

                <div className="text-[6px] mt-0.5">
                  SKU: {item.product.sku}
                </div>

                <div className="text-[6px]">
                  BAR: {item.product.barcode}
                </div>

                <div className="my-1">
                  <BarcodeBars value={item.product.barcode} />
                </div>

                <div className="flex items-center justify-between text-[6px] mt-1">
                  <span>{formatMoney(item.product.sellPrice)}</span>
                  <span>
                    {categories.find((c) => c.id === item.product.categoryId)?.name ?? ""}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 print:hidden">
        <button
          onClick={refreshProducts}
          className="rounded-xl border px-4 py-3 font-medium bg-white"
        >
          Refresh Products
        </button>
      </div>
    </MainLayout>
  );
}