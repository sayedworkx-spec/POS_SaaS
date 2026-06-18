import { useEffect, useMemo, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { getCurrentUser } from "../services/authService";
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  syncProductsCache,
  toggleProductStatus,
  updateProduct,
} from "../services/productsApi";
import type { Product } from "../types/Product";

type ProductFormState = {
  sku: string;
  barcode: string;
  name: string;
  categoryId: number;
  stock: number;
  costPrice: number;
  sellPrice: number;
  reorderLevel: number;
  isActive: boolean;
};

const EMPTY_FORM: ProductFormState = {
  sku: "",
  barcode: "",
  name: "",
  categoryId: 1,
  stock: 0,
  costPrice: 0,
  sellPrice: 0,
  reorderLevel: 10,
  isActive: true,
};

const CATEGORY_LABELS: Record<number, string> = {
  1: "Clothes",
  2: "Accessories",
  3: "Shoes",
  4: "Bags",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductsPage() {
  const currentUser = getCurrentUser();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");
      const list = await fetchProducts();
      setProducts(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return products;

    return products.filter((product) => {
      return (
        product.sku.toLowerCase().includes(term) ||
        product.barcode.toLowerCase().includes(term) ||
        product.name.toLowerCase().includes(term)
      );
    });
  }, [products, search]);

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((product) => product.isActive).length;
    const lowStock = products.filter(
      (product) => product.stock <= product.reorderLevel
    ).length;

    return { total, active, lowStock };
  }, [products]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      categoryId: product.categoryId,
      stock: product.stock,
      costPrice: product.costPrice,
      sellPrice: product.sellPrice,
      reorderLevel: product.reorderLevel,
      isActive: product.isActive,
    });
    setError("");
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");

      if (!form.sku.trim() || !form.barcode.trim() || !form.name.trim()) {
        throw new Error("SKU, barcode, and name are required");
      }

      if (editingId === null) {
        await createProduct(form);
      } else {
        await updateProduct(editingId, form);
      }

      await syncProductsCache();
      const list = await fetchProducts();
      setProducts(list);
      startCreate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save product");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(productId: number) {
    const ok = window.confirm("Delete this product?");
    if (!ok) return;

    try {
      setSaving(true);
      setError("");

      await deleteProduct(productId);
      await syncProductsCache();
      const list = await fetchProducts();
      setProducts(list);

      if (editingId === productId) {
        startCreate();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete product");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(productId: number) {
    try {
      setSaving(true);
      setError("");

      await toggleProductStatus(productId);
      await syncProductsCache();
      const list = await fetchProducts();
      setProducts(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage inventory master data from the backend
          </p>
          {currentUser && (
            <div className="mt-2 text-xs text-slate-400">
              Signed in as {currentUser.name} ({currentUser.role})
            </div>
          )}
        </div>

        <div className="w-full lg:w-96">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border bg-white p-3 shadow"
            placeholder="Search by SKU, barcode, or product name..."
          />
        </div>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-xs text-slate-500">Total Products</div>
          <div className="mt-1 text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-xs text-slate-500">Active</div>
          <div className="mt-1 text-2xl font-bold">{stats.active}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-xs text-slate-500">Low Stock</div>
          <div className="mt-1 text-2xl font-bold">{stats.lowStock}</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">
                {editingId === null ? "Add Product" : "Edit Product"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Full product master data
              </p>
            </div>

            {editingId !== null && (
              <button
                onClick={startCreate}
                className="rounded-xl border px-4 py-2 text-sm font-medium"
              >
                New
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">SKU</label>
              <input
                value={form.sku}
                onChange={(e) => setForm((c) => ({ ...c, sku: e.target.value }))}
                className="w-full rounded-xl border p-3"
                placeholder="P001"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Barcode</label>
              <input
                value={form.barcode}
                onChange={(e) =>
                  setForm((c) => ({ ...c, barcode: e.target.value }))
                }
                className="w-full rounded-xl border p-3"
                placeholder="10000001"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                className="w-full rounded-xl border p-3"
                placeholder="Product name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm((c) => ({ ...c, categoryId: Number(e.target.value) }))
                }
                className="w-full rounded-xl border p-3"
              >
                <option value={1}>Clothes</option>
                <option value={2}>Accessories</option>
                <option value={3}>Shoes</option>
                <option value={4}>Bags</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Status</label>
              <select
                value={form.isActive ? "active" : "inactive"}
                onChange={(e) =>
                  setForm((c) => ({ ...c, isActive: e.target.value === "active" }))
                }
                className="w-full rounded-xl border p-3"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Stock</label>
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) =>
                  setForm((c) => ({ ...c, stock: Number(e.target.value) }))
                }
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Reorder Level</label>
              <input
                type="number"
                min={0}
                value={form.reorderLevel}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    reorderLevel: Number(e.target.value),
                  }))
                }
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Cost Price</label>
              <input
                type="number"
                min={0}
                value={form.costPrice}
                onChange={(e) =>
                  setForm((c) => ({ ...c, costPrice: Number(e.target.value) }))
                }
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Sell Price</label>
              <input
                type="number"
                min={0}
                value={form.sellPrice}
                onChange={(e) =>
                  setForm((c) => ({ ...c, sellPrice: Number(e.target.value) }))
                }
                className="w-full rounded-xl border p-3"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId === null ? "Create Product" : "Update Product"}
            </button>

            <button
              onClick={startCreate}
              className="rounded-xl border px-4 py-3 font-semibold"
            >
              Reset
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-white shadow overflow-hidden">
          <div className="border-b p-5">
            <h2 className="text-xl font-bold">Product List</h2>
            <p className="mt-1 text-sm text-slate-500">
              Backend-synced and cached locally for the rest of the POS
            </p>
          </div>

          {loading ? (
            <div className="p-6 text-slate-500">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-6 text-slate-500">No products found</div>
          ) : (
            <div className="max-h-[78vh] overflow-auto">
              {filteredProducts.map((product) => {
                const lowStock = product.stock <= product.reorderLevel;

                return (
                  <div key={product.id} className="border-b p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500">
                          {product.sku} • {product.barcode}
                        </div>
                        <div className="mt-1 text-lg font-semibold">
                          {product.name}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            {CATEGORY_LABELS[product.categoryId] ??
                              `Category ${product.categoryId}`}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 ${
                              product.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {product.isActive ? "Active" : "Inactive"}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 ${
                              lowStock
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            Stock {product.stock}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold">
                          Sell: {formatMoney(product.sellPrice)}
                        </div>
                        <div className="text-sm text-slate-500">
                          Cost: {formatMoney(product.costPrice)}
                        </div>
                        <div className="text-sm text-slate-500">
                          Reorder: {product.reorderLevel}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => startEdit(product)}
                        className="rounded-xl border px-4 py-2 text-sm font-medium"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleToggle(product.id)}
                        disabled={saving}
                        className="rounded-xl border px-4 py-2 text-sm font-medium"
                      >
                        Toggle Status
                      </button>

                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={saving}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}