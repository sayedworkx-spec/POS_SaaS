export interface SalesReturnItem {
  id: number;
  returnId: number;
  productId: number;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  refundTotal: number;
}

export interface SalesReturn {
  id: number;
  returnNumber: string;
  returnDate: string;
  saleId: number;
  invoiceNumber: string;
  cashier: string;
  reason: string;
  refundMethod: "cash" | "card";
  shiftId: number | null;
  subtotal: number;
  refundAmount: number;
  items: SalesReturnItem[];
  createdAt?: string;
  updatedAt?: string;
}