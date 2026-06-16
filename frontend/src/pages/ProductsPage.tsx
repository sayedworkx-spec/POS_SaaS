import { useMemo, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import AddProductForm from "../components/AddProductForm";
import ProductTable from "../components/ProductTable";
import ProductEditModal from "../components/ProductEditModal";

import {
  deleteProduct,
  getProducts,
  toggleProductStatus,
} from "../services/productService";
import { getCategories } from "../services/categoryService";

import type { Product } from "../types/Product";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(() => getProducts());
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const categories = useMemo(() => getCategories(), []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.sku.toLowerCase().includes(term) ||
        product.name.toLowerCase().includes(term) ||
        product.barcode.toLowerCase().includes(term);

      const matchesCategory =
        selectedCategory === "all" ||
        product.categoryId === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const totalProducts = products.length;

  const totalStock = useMemo(() => {
    return products.reduce((sum, product) => sum + product.stock, 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter((product) => product.stock <= product.reorderLevel)
      .length;
  }, [products]);

  const activeCount = useMemo(() => {
    return products.filter((product) => product.isActive).length;
  }, [products]);

  function refreshProducts() {
    setProducts(getProducts());
  }

  function handleDelete(productId: number) {
    const ok = window.confirm("Delete this product?");
    if (!ok) return;

    deleteProduct(productId);
    refreshProducts();
  }

  function handleToggleStatus(productId: number) {
    toggleProductStatus(productId);
    refreshProducts();
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage product master, pricing, and stock level
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow px-4 py-3">
            <div className="text-xs text-slate-500">Products</div>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </div>

          <div className="bg-white rounded-xl shadow px-4 py-3">
            <div className="text-xs text-slate-500">Stock</div>
            <div className="text-2xl font-bold">{totalStock}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="text-xs text-slate-500">Active Products</div>
          <div className="text-2xl font-bold mt-2">{activeCount}</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <div className="text-xs text-slate-500">Low Stock</div>
          <div className="text-2xl font-bold mt-2 text-red-600">{lowStockCount}</div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          <div className="text-xs text-slate-500">Inventory Value</div>
          <div className="text-2xl font-bold mt-2">
            {formatMoney(
              products.reduce(
                (sum, product) => sum + product.stock * product.costPrice,
                0
              )
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 mb-6">
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

      <div className="mb-6">
        <AddProductForm onSaved={refreshProducts} />
      </div>

      <ProductTable
        products={filteredProducts}
        onEdit={(product) => setEditingProduct(product)}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
      />

      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={refreshProducts}
        />
      )}
    </MainLayout>
  );
}