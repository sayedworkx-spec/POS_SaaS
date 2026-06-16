import MainLayout from "../layouts/MainLayout";
import { getProducts } from "../services/productService";

export default function StockReportPage() {
  const products = getProducts();

  return (
    <MainLayout>
      <h1 className="text-3xl font-bold mb-6">
        Stock Report
      </h1>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">

          <thead>
            <tr className="border-b bg-gray-50">
              <th className="p-4 text-left">SKU</th>
              <th className="p-4 text-left">Product</th>
              <th className="p-4 text-left">Stock</th>
              <th className="p-4 text-left">Reorder Level</th>
              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>

          <tbody>

            {products.map((product) => {

              const lowStock =
                product.stock <= product.reorderLevel;

              return (
                <tr
                  key={product.id}
                  className="border-b"
                >
                  <td className="p-4">
                    {product.sku}
                  </td>

                  <td className="p-4">
                    {product.name}
                  </td>

                  <td className="p-4">
                    {product.stock}
                  </td>

                  <td className="p-4">
                    {product.reorderLevel}
                  </td>

                  <td className="p-4">
                    {lowStock ? (
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded">
                        LOW STOCK
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

          </tbody>

        </table>
      </div>
    </MainLayout>
  );
}