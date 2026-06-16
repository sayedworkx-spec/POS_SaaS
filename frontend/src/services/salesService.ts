import { getProducts, updateProductStock } from "./productService";
import { saveInventoryMovement } from "./inventoryMovementService";
import type { Sale } from "../types/Sale";

const SALES_KEY = "sales";

function normalizeSale(raw: any): Sale {
  const products = getProducts();

  const items = Array.isArray(raw?.items)
    ? raw.items.map((item: any) => {
        const product =
          products.find((p) => p.id === Number(item?.productId)) ?? null;

        const productId = Number(item?.productId ?? 0);
        const sku = String(item?.sku ?? product?.sku ?? "").trim();
        const name = String(item?.name ?? product?.name ?? "").trim();
        const quantity = Number(item?.quantity ?? 0);
        const unitPrice = Number(item?.unitPrice ?? 0);
        const costPrice = Number(item?.costPrice ?? product?.costPrice ?? 0);
        const lineTotal = Number(item?.lineTotal ?? unitPrice * quantity);
        const costTotal = Number(item?.costTotal ?? costPrice * quantity);

        return {
          productId,
          sku,
          name,
          quantity,
          unitPrice,
          costPrice,
          lineTotal,
          costTotal,
        };
      })
    : [];

  const subtotal = Number(
    raw?.subtotal ??
      items.reduce((sum: number, item: any) => sum + item.lineTotal, 0)
  );

  const costTotal = Number(
    raw?.costTotal ??
      items.reduce((sum: number, item: any) => sum + item.costTotal, 0)
  );

  const discountAmount = Number(raw?.discountAmount ?? 0);
  const total = Number(raw?.total ?? subtotal - discountAmount);

  return {
    id: Number(raw?.id ?? Date.now()),
    invoiceNumber: String(raw?.invoiceNumber ?? `INV-${Date.now()}`),
    saleDate: String(raw?.saleDate ?? new Date().toISOString()),
    cashier: String(raw?.cashier ?? "Cashier"),
    shiftId: Number(raw?.shiftId ?? 0),
    paymentMethod: raw?.paymentMethod === "card" ? "card" : "cash",
    subtotal,
    costTotal,
    profit: Number(raw?.profit ?? total - costTotal),
    discountPercent: Number(raw?.discountPercent ?? 0),
    discountAmount,
    total,
    cashReceived: Number(raw?.cashReceived ?? 0),
    change: Number(raw?.change ?? 0),
    items,
  };
}

function readSales(): Sale[] {
  const raw = localStorage.getItem(SALES_KEY);

  if (!raw) {
    localStorage.setItem(SALES_KEY, JSON.stringify([]));
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as any[];
    const normalized = Array.isArray(parsed) ? parsed.map(normalizeSale) : [];
    localStorage.setItem(SALES_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    localStorage.setItem(SALES_KEY, JSON.stringify([]));
    return [];
  }
}

function writeSales(sales: Sale[]) {
  localStorage.setItem(SALES_KEY, JSON.stringify(sales));
}

export function getSales(): Sale[] {
  return readSales();
}

export function getSaleByInvoiceNumber(invoiceNumber: string): Sale | null {
  const sales = readSales();
  return sales.find((sale) => sale.invoiceNumber === invoiceNumber) ?? null;
}

export function addSale(sale: Omit<Sale, "id">) {
  const products = getProducts();

  const items = sale.items.map((item) => {
    const product = products.find((p) => p.id === item.productId);

    if (!product) {
      throw new Error(`Product not found: ${item.name}`);
    }

    if (product.stock < item.quantity) {
      throw new Error(`Not enough stock for ${product.name}`);
    }

    return {
      ...item,
      costPrice: Number(item.costPrice ?? product.costPrice),
      costTotal: Number(
        item.costTotal ??
          Number(item.costPrice ?? product.costPrice) * item.quantity
      ),
    };
  });

  let computedCostTotal = 0;
  for (const item of items) {
    computedCostTotal += item.costTotal;
  }

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    updateProductStock(item.productId, -item.quantity);

    saveInventoryMovement({
      id: Date.now() + item.productId + index,
      productId: item.productId,
      movementType: "OUT",
      quantity: item.quantity,
      movementDate: sale.saleDate,
    });
  }

  const sales = readSales();

  const finalCostTotal = sale.costTotal ?? computedCostTotal;
  const finalProfit = sale.profit ?? sale.total - finalCostTotal;

  const newSale: Sale = {
    id: Date.now(),
    ...sale,
    costTotal: finalCostTotal,
    profit: finalProfit,
    items,
  };

  sales.push(newSale);
  writeSales(sales);

  return newSale;
}