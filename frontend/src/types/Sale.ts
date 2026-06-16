export type SalePaymentMethod = "cash" | "card";

export interface SaleItem {
  productId: number;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  lineTotal: number;
  costTotal: number;
}

export interface Sale {
  id: number;
  invoiceNumber: string;
  saleDate: string;
  cashier: string;
  shiftId: number;
  paymentMethod: SalePaymentMethod;
  subtotal: number;
  costTotal: number;
  profit: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  cashReceived: number;
  change: number;
  items: SaleItem[];
}