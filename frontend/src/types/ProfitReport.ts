export interface ProfitReportDailyRow {
  date: string;
  salesCount: number;
  revenueGross: number;
  cogsGross: number;
  grossProfit: number;
  returnsCount: number;
  refundAmount: number;
  returnedCost: number;
  expensesCount: number;
  expensesCash: number;
  expensesCard: number;
  totalExpenses: number;
  netProfit: number;
}

export interface ProfitReportTopProduct {
  productId: number;
  sku: string;
  name: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface ProfitReportRecentSale {
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

export interface ProfitReportRecentReturn {
  id: number;
  returnNumber: string;
  returnDate: string;
  invoiceNumber: string;
  cashier: string;
  refundMethod: "cash" | "card";
  refundAmount: number;
  itemCount: number;
}

export interface ProfitReportRecentExpense {
  id: number;
  expenseNumber: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: "cash" | "card";
  shiftId: number | null;
  createdBy: string;
}

export interface ProfitReportSnapshot {
  range: {
    startDate: string;
    endDate: string;
  };
  totals: {
    salesCount: number;
    returnsCount: number;
    expensesCount: number;
    grossRevenue: number;
    grossCOGS: number;
    grossProfit: number;
    refundAmount: number;
    returnedCost: number;
    netRevenue: number;
    netCOGS: number;
    operatingProfit: number;
    totalExpenses: number;
    cashExpenses: number;
    cardExpenses: number;
    netProfit: number;
    cashIn: number;
    cashOut: number;
    netCash: number;
    averageOrderValue: number;
    marginPercent: number;
  };
  dailyRows: ProfitReportDailyRow[];
  topProducts: ProfitReportTopProduct[];
  lowStockProducts: {
    id: number;
    sku: string;
    name: string;
    stock: number;
    reorderLevel: number;
    isActive: boolean;
  }[];
  expensesByCategory: {
    category: string;
    amount: number;
    count: number;
  }[];
  recentSales: ProfitReportRecentSale[];
  recentReturns: ProfitReportRecentReturn[];
  recentExpenses: ProfitReportRecentExpense[];
}