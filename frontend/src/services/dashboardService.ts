import { getProducts } from "./productService";
import { getPurchases } from "./purchaseService";
import { getSales } from "./salesService";

export function getDashboardData() {
  const products = getProducts();

  const purchases = getPurchases();

  const sales = getSales();

  const totalProducts =
    products.length;

  const totalStock =
    products.reduce(
      (sum, product) =>
        sum + product.stock,
      0
    );

  const totalPurchases =
    purchases.length;

  const totalSales =
    sales.length;

  const lowStockProducts =
    products.filter(
      (product) =>
        product.stock <=
        product.reorderLevel
    ).length;

  return {
    totalProducts,
    totalStock,
    totalPurchases,
    totalSales,
    lowStockProducts,
  };
}