export interface Product {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  categoryId: number;
  stock: number;
  costPrice: number;
  sellPrice: number;
  reorderLevel: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}