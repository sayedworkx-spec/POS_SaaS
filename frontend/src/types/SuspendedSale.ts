export interface SuspendedSaleItem {
  productId: number;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  lineTotal: number;
  costTotal: number;
}

export interface SuspendedSale {
  id: number;
  reference: string;
  createdAt: string;
  cashier: string;
  reason: string;
  paymentMethod: "cash" | "card";
  discountPercent: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  costTotal: number;
  items: SuspendedSaleItem[];
}

export interface SuspendedSaleDraft {
  sourceId: number;
  sale: SuspendedSale;
}