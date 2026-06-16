export interface ReturnItem {
  productId: number;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  refundAmount: number;
  costAmount: number;
}

export interface SaleReturn {
  id: number;
  returnNumber: string;
  returnDate: string;
  originalSaleId: number;
  originalInvoiceNumber: string;
  cashier: string;
  paymentMethod: "cash" | "card";
  reason: string;
  createdBy: string;
  refundAmount: number;
  costAmount: number;
  profitImpact: number;
  items: ReturnItem[];
}