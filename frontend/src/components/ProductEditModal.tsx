import { useEffect, useState } from "react";

import { updateProduct } from "../services/productService";
import { getCategories } from "../services/categoryService";
import type { Product } from "../types/Product";

type Props = {
  product: Product;
  onClose: () => void;
  onSaved: () => void;
};

export default function ProductEditModal({
  product,
  onClose,
  onSaved,
}: Props) {
  const categories = getCategories();

  const [sku, setSku] = useState(product.sku);
  const [barcode, setBarcode] = useState(product.barcode);
  const [name, setName] = useState(product.name);
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [stock, setStock] = useState(product.stock);
  const [costPrice, setCostPrice] = useState(product.costPrice);
  const [sellPrice, setSellPrice] = useState(product.sellPrice);
  const [reorderLevel, setReorderLevel] = useState(product.reorderLevel);
  const [isActive, setIsActive] = useState(product.isActive);

  useEffect(() => {
    setSku(product.sku);
    setBarcode(product.barcode);
    setName(product.name);
    setCategoryId(product.categoryId);
    setStock(product.stock);
    setCostPrice(product.costPrice);
    setSellPrice(product.sellPrice);
    setReorderLevel(product.reorderLevel);
    setIsActive(product.isActive);
  }, [product]);

  function handleSave() {
    const trimmedSku = sku.trim();
    const trimmedBarcode = barcode.trim();
    const trimmedName = name.trim();

    if (!trimmedSku || !trimmedBarcode || !trimmedName) {
      alert("SKU, Barcode, and Name are required");
      return;
    }

    try {
      updateProduct(product.id, {
        sku: trimmedSku,
        barcode: trimmedBarcode,
        name: trimmedName,
        categoryId,
        stock,
        costPrice,
        sellPrice,
        reorderLevel,
        isActive,
      });

      alert("Product Updated");
      onSaved();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to update product");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold">Edit Product</h2>
            <p className="text-sm text-slate-500 mt-1">
              Update product master record
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border px-4 py-2 text-sm font-medium"
          >
            Close
          </button>
        </div>

        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-2">SKU</label>
              <input
                className="w-full border rounded-xl p-3"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Barcode</label>
              <input
                className="w-full border rounded-xl p-3"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                className="w-full border rounded-xl p-3"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                className="w-full border rounded-xl p-3"
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Stock</label>
              <input
                type="number"
                className="w-full border rounded-xl p-3"
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cost Price</label>
              <input
                type="number"
                className="w-full border rounded-xl p-3"
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Sell Price</label>
              <input
                type="number"
                className="w-full border rounded-xl p-3"
                value={sellPrice}
                onChange={(e) => setSellPrice(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Reorder Level</label>
              <input
                type="number"
                className="w-full border rounded-xl p-3"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(Number(e.target.value))}
              />
            </div>

            <div className="flex items-center gap-3 pt-8">
              <input
                id="editIsActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="editIsActive" className="text-sm font-medium">
                Active Product
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              className="rounded-xl border px-5 py-3 font-semibold"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              onClick={handleSave}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}