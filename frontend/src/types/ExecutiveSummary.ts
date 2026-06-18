export interface ExecutiveSummaryAlert {
  level: "info" | "warning" | "critical";
  title: string;
  details: string;
}

export interface ExecutiveSummarySnapshot {
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
  inventory: {
    endingQty: number;
    endingInventoryValue: number;
    endingInventorySellValue: number;
    inventoryPotentialMargin: number;
    lowStockCount: number;
    zeroStockCount: number;
    activeProducts: number;
    inactiveProducts: number;
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
  currentShiftSummary: {
    shift: {
      id: number;
      userId: number | null;
      userName: string;
      openingCash: number;
      closingCash: number | null;
      actualCash: number | null;
      difference: number | null;
      status: string;
      openedAt: string;
      closedAt: string | null;
    };
    openingCash: number;
    cashIn: number;
    cashOut: number;
    expectedCash: number;
    actualCash: number;
    difference: number;
  } | null;
  alerts: ExecutiveSummaryAlert[];
  lowStockProducts: Array<{
    id: number;
    sku: string;
    name: string;
    stock: number;
    reorderLevel: number;
    isActive: boolean;
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