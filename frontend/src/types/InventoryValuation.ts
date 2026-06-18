export interface InventoryValuationRow {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  stock: number;
  costPrice: number;
  sellPrice: number;
  reorderLevel: number;
  isActive: boolean;
  lineValue: number;
  stockValue: number;
  sellValue: number;
  potentialGrossMargin: number;
  status: "ok" | "low_stock" | "out_of_stock";
}

export interface InventoryValuationSummary {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  lowStockProducts: number;
  zeroStockProducts: number;
  totalQty: number;
  totalInventoryValue: number;
  totalSellValue: number;
  totalPotentialMargin: number;
  averageUnitCost: number;
  averageUnitSell: number;
}

export interface InventoryValuationSnapshot {
  summary: InventoryValuationSummary;
  rows: InventoryValuationRow[];
  topValueProducts: InventoryValuationRow[];
  topQtyProducts: InventoryValuationRow[];
  lowStockProducts: InventoryValuationRow[];
  zeroStockProducts: InventoryValuationRow[];
}