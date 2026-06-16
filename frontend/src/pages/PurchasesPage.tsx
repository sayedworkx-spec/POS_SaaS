import { useMemo, useState } from "react";

import MainLayout from "../layouts/MainLayout";

import { addPurchase, getPurchases } from "../services/purchaseService";
import { getProducts } from "../services/productService";

import type { Product } from "../types/Product";
import type { Purchase } from "../types/Purchase";

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

function isSameMonth(dateString: string) {
  const value = new Date(dateString);
  const today = new Date();

  return (
    value.getFullYear() === today.getFullYear() &&
    value.getMonth() === today.getMonth()
  );
}

function getProductLabel(product: Product | undefined, productId: number) {
  if (!product) {
    return `Product #${productId}`;
  }

  return product.name;
}

export default function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>(() => getProducts());
  const [purchases, setPurchases] = useState<Purchase[]>(() => getPurchases());
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState(() => getProducts()[0]?.id ?? 1);
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(() => getProducts()[0]?.costPrice ?? 0);
  const [message, setMessage] = useState("");

  const productMap = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  const selectedProduct = productMap.get(productId);
  const lineTotal = Math.max(0, quantity) * Math.max(0, unitCost);
  const stockAfterReceiving = (selectedProduct?.stock ?? 0) + Math.max(0, quantity);

  const sortedPurchases = useMemo(() => {
    return purchases
      .slice()
      .sort(
        (a, b) =>
          new Date(b.purchaseDate).getTime() -
          new Date(a.purchaseDate).getTime()
      );
  }, [purchases]);

  const filteredPurchases = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return sortedPurchases;
    }

    return sortedPurchases.filter((purchase) => {
      const product = productMap.get(purchase.productId);
      const productName = product?.name.toLowerCase() ?? "";
      const sku = product?.sku.toLowerCase() ?? "";
      const barcode = product?.barcode.toLowerCase() ?? "";

      return (
        productName.includes(term) ||
        sku.includes(term) ||
        barcode.includes(term) ||
        String(purchase.productId).includes(term) ||
        String(purchase.quantity).includes(term) ||
        String(purchase.unitCost).includes(term) ||
        purchase.purchaseDate.toLowerCase().includes(term)
      );
    });
  }, [productMap, search, sortedPurchases]);

  const todayPurchases = useMemo(() => {
    return purchases.filter((purchase) => isToday(purchase.purchaseDate));
  }, [purchases]);

  const monthPurchases = useMemo(() => {
    return purchases.filter((purchase) => isSameMonth(purchase.purchaseDate));
  }, [purchases]);

  const todayTotal = useMemo(() => {
    return todayPurchases.reduce(
      (sum, purchase) => sum + purchase.quantity * purchase.unitCost,
      0
    );
  }, [todayPurchases]);

  const monthTotal = useMemo(() => {
    return monthPurchases.reduce(
      (sum, purchase) => sum + purchase.quantity * purchase.unitCost,
      0
    );
  }, [monthPurchases]);

  const receivedUnitsThisMonth = useMemo(() => {
    return monthPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
  }, [monthPurchases]);

  const lowStockCount = useMemo(() => {
    return products.filter((product) => product.stock <= product.reorderLevel).length;
  }, [products]);

  function refreshData() {
    setPurchases(getPurchases());
    setProducts(getProducts());
  }

  function handleProductChange(nextProductId: number) {
    setProductId(nextProductId);

    const product = productMap.get(nextProductId);

    if (product) {
      setUnitCost(product.costPrice);
    }
  }

  function resetForm() {
    setQuantity(1);
    setUnitCost(selectedProduct?.costPrice ?? 0);
  }

  function handleSave() {
    if (!selectedProduct) {
      alert("Select a valid product");
      return;
    }

    if (quantity <= 0) {
      alert("Quantity must be greater than 0");
      return;
    }

    if (unitCost < 0) {
      alert("Unit cost cannot be negative");
      return;
    }

    try {
      const result = addPurchase({
        productId,
        quantity,
        unitCost,
        purchaseDate: new Date().toISOString(),
      });

      refreshData();
      resetForm();
      setMessage(`Purchase received for ${selectedProduct.name}`);
      setSearch(result.id.toString());
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to save purchase");
    }
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Purchases</h1>
          <p className="text-sm text-slate-500 mt-1">
            Receive stock and track inventory cost
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Products</div>
            <div className="font-bold mt-1">{products.length}</div>
          </div>

          <div className="rounded-xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Low Stock</div>
            <div className="font-bold mt-1 text-red-600">{lowStockCount}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Today's Purchases</div>
          <div className="text-3xl font-bold mt-2">{formatMoney(todayTotal)}</div>
          <div className="text-sm text-slate-500 mt-2">
            {todayPurchases.length} receiving records
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Month Purchases</div>
          <div className="text-3xl font-bold mt-2">{formatMoney(monthTotal)}</div>
          <div className="text-sm text-slate-500 mt-2">
            {monthPurchases.length} records this month
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Units Received</div>
          <div className="text-3xl font-bold mt-2 text-emerald-600">
            {formatMoney(receivedUnitsThisMonth)}
          </div>
          <div className="text-sm text-slate-500 mt-2">This month</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Average Unit Cost</div>
          <div className="text-3xl font-bold mt-2">
            {formatMoney(
              receivedUnitsThisMonth > 0 ? monthTotal / receivedUnitsThisMonth : 0
            )}
          </div>
          <div className="text-sm text-slate-500 mt-2">Based on month receipts</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-bold">Receive Stock</h2>
              <p className="text-sm text-slate-500 mt-1">
                Add incoming quantity to inventory
              </p>
            </div>

            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Inventory IN
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Product</label>
              <select
                value={productId}
                onChange={(event) => handleProductChange(Number(event.target.value))}
                className="w-full rounded-xl border p-3"
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  className="w-full rounded-xl border p-3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Unit Cost</label>
                <input
                  type="number"
                  min="0"
                  value={unitCost}
                  onChange={(event) => setUnitCost(Number(event.target.value))}
                  className="w-full rounded-xl border p-3"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Current Stock</div>
                <div className="font-bold mt-1">{selectedProduct?.stock ?? 0}</div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">After Receiving</div>
                <div className="font-bold mt-1 text-emerald-600">
                  {stockAfterReceiving}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">Purchase Value</div>
                <div className="font-bold mt-1">{formatMoney(lineTotal)}</div>
              </div>
            </div>

            {message && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                {message}
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-700"
            >
              Save Purchase
            </button>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-bold">Purchase History</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Incoming stock records and cost details
                </p>
              </div>

              <div className="w-full lg:w-80">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search product, SKU, barcode, or date..."
                  className="w-full rounded-xl border p-3"
                />
              </div>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-4 text-left">Product</th>
                  <th className="p-4 text-left">Qty</th>
                  <th className="p-4 text-left">Unit Cost</th>
                  <th className="p-4 text-left">Total Cost</th>
                  <th className="p-4 text-left">Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No purchases found
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase) => {
                    const product = productMap.get(purchase.productId);
                    const totalCost = purchase.quantity * purchase.unitCost;

                    return (
                      <tr key={purchase.id} className="border-t">
                        <td className="p-4">
                          <div className="font-semibold">
                            {getProductLabel(product, purchase.productId)}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            SKU {product?.sku ?? "N/A"} - Product #{purchase.productId}
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                            +{purchase.quantity}
                          </span>
                        </td>

                        <td className="p-4">{formatMoney(purchase.unitCost)}</td>

                        <td className="p-4 font-semibold">
                          {formatMoney(totalCost)}
                        </td>

                        <td className="p-4 text-sm text-slate-600">
                          {formatDate(purchase.purchaseDate)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
