import type { Product } from "../types/Product";
import { getCategoryNameById } from "../services/categoryService";

type Props = {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: number) => void;
  onToggleStatus: (productId: number) => void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductTable({
  products,
  onEdit,
  onDelete,
  onToggleStatus,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Product List</h2>
        <span className="text-xs text-slate-500">
          {products.length} items
        </span>
      </div>

      <div className="overflow-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 text-left">SKU</th>
              <th className="p-4 text-left">Barcode</th>
              <th className="p-4 text-left">Product</th>
              <th className="p-4 text-left">Category</th>
              <th className="p-4 text-left">Stock</th>
              <th className="p-4 text-left">Cost</th>
              <th className="p-4 text-left">Sell</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {products.length === 0 ? (
              <tr>
                <td className="p-6 text-slate-500" colSpan={9}>
                  No products found
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const lowStock = product.stock <= product.reorderLevel;

                return (
                  <tr key={product.id} className="border-t">
                    <td className="p-4 font-medium">{product.sku}</td>
                    <td className="p-4">{product.barcode}</td>

                    <td className="p-4">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Reorder: {product.reorderLevel}
                      </div>
                    </td>

                    <td className="p-4">
                      {getCategoryNameById(product.categoryId)}
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          lowStock
                            ? "bg-red-100 text-red-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>

                    <td className="p-4">{formatMoney(product.costPrice)}</td>

                    <td className="p-4 font-semibold">
                      {formatMoney(product.sellPrice)}
                    </td>

                    <td className="p-4">
                      {product.isActive ? (
                        <span className="rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-semibold">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 text-slate-600 px-3 py-1 text-xs font-semibold">
                          INACTIVE
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                          onClick={() => onEdit(product)}
                        >
                          Edit
                        </button>

                        <button
                          className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                          onClick={() => onToggleStatus(product.id)}
                        >
                          {product.isActive ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                          onClick={() => onDelete(product.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}