import { useState } from "react";

import { addProduct } from "../services/productService";
import { getCategories } from "../services/categoryService";

type Props = {
  onSaved?: () => void;
};

export default function AddProductForm({ onSaved }: Props) {
  const categories = getCategories();

  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 1);
  const [stock, setStock] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [reorderLevel, setReorderLevel] = useState(10);
  const [isActive, setIsActive] = useState(true);

  function resetForm() {
    setSku("");
    setBarcode("");
    setName("");
    setCategoryId(categories[0]?.id ?? 1);
    setStock(0);
    setCostPrice(0);
    setSellPrice(0);
    setReorderLevel(10);
    setIsActive(true);
  }

  function handleSave() {
    const trimmedSku = sku.trim();
    const trimmedBarcode = barcode.trim();
    const trimmedName = name.trim();

    if (!trimmedSku || !trimmedBarcode || !trimmedName) {
      alert("SKU, Barcode, and Name are required");
      return;
    }

    addProduct({
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

    alert("Product Added");

    resetForm();
    onSaved?.();
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Add Product</h2>
          <p className="text-sm text-slate-500 mt-1">
            Create a new product master record
          </p>
        </div>

        <span className="text-xs rounded-full bg-slate-100 px-3 py-1 text-slate-600">
          Product Master
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-2">SKU</label>
          <input
            className="w-full border rounded-xl p-3"
            placeholder="P100"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Barcode</label>
          <input
            className="w-full border rounded-xl p-3"
            placeholder="100100"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            className="w-full border rounded-xl p-3"
            placeholder="Product name"
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
          <label className="block text-sm font-medium mb-2">Opening Stock</label>
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
            id="isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="isActive" className="text-sm font-medium">
            Active Product
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
          onClick={handleSave}
        >
          Save Product
        </button>
      </div>
    </div>
  );
}