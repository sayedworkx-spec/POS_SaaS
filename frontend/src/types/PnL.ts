export interface PnLStatementLine {
  label: string;
  amount: number;
  kind: "positive" | "negative" | "subtotal" | "total";
}

export interface PnLInventoryBridge {
  endingQty: number;
  endingInventoryValue: number;
  endingInventorySellValue: number;
  inventoryPotentialMargin: number;
  lowStockCount: number;
  zeroStockCount: number;
  activeProducts: number;
  inactiveProducts: number;
}

export interface PnLReportSnapshot {
  range: {
    startDate: string;
    endDate: string;
  };
  overview: {
    totalProducts: number;
    activeProducts: number;
    lowStockProducts: number;
    todaySalesCount: number;
    todayRevenue: number;
    todayProfit: number;
    returnsCount: number;
    openShiftsCount: number;
  };
  inventory: PnLInventoryBridge;
  inventoryBridge: PnLInventoryBridge;
  statementLines: PnLStatementLine[];
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
  dailyRows: Array<{
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
  }>;
  topProducts: Array<{
    productId: number;
    sku: string;
    name: string;
    quantitySold: number;
    revenue: number;
    cost: number;
    profit: number;
  }>;
  lowStockProducts: Array<{
    id: number;
    sku: string;
    name: string;
    stock: number;
    reorderLevel: number;
    isActive: boolean;
  }>;
  expensesByCategory: Array<{
    category: string;
    amount: number;
    count: number;
  }>;
  recentSales: Array<{
    id: number;
    invoiceNumber: string;
    saleDate: string;
    cashier: string;
    shiftId: number;
    paymentMethod: "cash" | "card";
    total: number;
    profit: number;
    itemsCount: number;
  }>;
  recentReturns: Array<{
    id: number;
    returnNumber: string;
    returnDate: string;
    invoiceNumber: string;
    cashier: string;
    refundMethod: "cash" | "card";
    refundAmount: number;
    itemCount: number;
  }>;
  recentExpenses: Array<{
    id: number;
    expenseNumber: string;
    expenseDate: string;
    category: string;
    description: string;
    amount: number;
    paymentMethod: "cash" | "card";
    shiftId: number | null;
    createdBy: string;
  }>;   
}

