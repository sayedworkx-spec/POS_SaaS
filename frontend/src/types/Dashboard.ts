import type { CashRegisterSummary } from "./CashRegister";

export interface DashboardOverview {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  todaySalesCount: number;
  todayRevenue: number;
  todayProfit: number;
  returnsCount: number;
  openShiftsCount: number;
}

export interface DashboardRecentSale {
  id: number;
  invoiceNumber: string;
  saleDate: string;
  cashier: string;
  shiftId: number;
  paymentMethod: "cash" | "card";
  total: number;
  profit: number;
  itemsCount: number;
}

export interface DashboardLowStockProduct {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  stock: number;
  reorderLevel: number;
  isActive: boolean;
}

export interface DashboardTopProduct {
  productId: number;
  sku: string;
  name: string;
  stock: number;
  isActive: boolean;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface DashboardSnapshot {
  overview: DashboardOverview;
  currentShiftSummary: CashRegisterSummary | null;
  recentSales: DashboardRecentSale[];
  lowStockProducts: DashboardLowStockProduct[];
  topProducts: DashboardTopProduct[];
}