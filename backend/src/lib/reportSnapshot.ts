import { prisma } from "./prisma.js";

type DateRange = {
  start: Date;
  end: Date;
};

type SerializedSale = {
  id: number;
  invoiceNumber: string;
  saleDate: string;
  cashier: string;
  shiftId: number;
  paymentMethod: "cash" | "card";
  total: number;
  profit: number;
  itemsCount: number;
};

type SerializedReturn = {
  id: number;
  returnNumber: string;
  returnDate: string;
  invoiceNumber: string;
  cashier: string;
  refundMethod: "cash" | "card";
  refundAmount: number;
  itemCount: number;
};

type SerializedExpense = {
  id: number;
  expenseNumber: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: "cash" | "card";
  shiftId: number | null;
  createdBy: string;
};

type SerializedProduct = {
  id: number;
  sku: string;
  barcode?: string;
  name: string;
  stock: number;
  reorderLevel: number;
  isActive: boolean;
};

type SerializedTopProduct = {
  productId: number;
  sku: string;
  name: string;
  stock?: number;
  isActive?: boolean;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
};

type SerializedDailyRow = {
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
};

type SerializedExpenseCategory = {
  category: string;
  amount: number;
  count: number;
};

type SerializedShift = {
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

type CurrentShiftSummary = {
  shift: SerializedShift;
  openingCash: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
};

type InventorySummary = {
  endingQty: number;
  endingInventoryValue: number;
  endingInventorySellValue: number;
  inventoryPotentialMargin: number;
  lowStockCount: number;
  zeroStockCount: number;
  activeProducts: number;
  inactiveProducts: number;
};

export type ReportSnapshot = {
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
  inventory: InventorySummary;
  currentShiftSummary: CurrentShiftSummary | null;
  recentSales: SerializedSale[];
  recentReturns: SerializedReturn[];
  recentExpenses: SerializedExpense[];
  lowStockProducts: SerializedProduct[];
  topProducts: SerializedTopProduct[];
  expensesByCategory: SerializedExpenseCategory[];
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
  dailyRows: SerializedDailyRow[];
};

function startOfDay(value = new Date()) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

function serializeSale(sale: any): SerializedSale {
  return {
    id: Number(sale.id),
    invoiceNumber: String(sale.invoiceNumber),
    saleDate:
      sale.saleDate instanceof Date
        ? sale.saleDate.toISOString()
        : String(sale.saleDate),
    cashier: String(sale.cashier),
    shiftId: Number(sale.shiftId),
    paymentMethod: sale.paymentMethod as "cash" | "card",
    total: Number(sale.total),
    profit: Number(sale.profit),
    itemsCount: Array.isArray(sale.items) ? sale.items.length : 0,
  };
}

function serializeReturn(ret: any): SerializedReturn {
  return {
    id: Number(ret.id),
    returnNumber: String(ret.returnNumber),
    returnDate:
      ret.returnDate instanceof Date
        ? ret.returnDate.toISOString()
        : String(ret.returnDate),
    invoiceNumber: String(ret.invoiceNumber),
    cashier: String(ret.cashier),
    refundMethod: ret.refundMethod as "cash" | "card",
    refundAmount: Number(ret.refundAmount),
    itemCount: Array.isArray(ret.items) ? ret.items.length : 0,
  };
}

function serializeExpense(expense: any): SerializedExpense {
  return {
    id: Number(expense.id),
    expenseNumber: String(expense.expenseNumber),
    expenseDate:
      expense.expenseDate instanceof Date
        ? expense.expenseDate.toISOString()
        : String(expense.expenseDate),
    category: String(expense.category),
    description: String(expense.description),
    amount: Number(expense.amount),
    paymentMethod: expense.paymentMethod as "cash" | "card",
    shiftId: expense.shiftId !== null ? Number(expense.shiftId) : null,
    createdBy: String(expense.createdBy),
  };
}

function serializeProduct(product: any): SerializedProduct {
  return {
    id: Number(product.id),
    sku: String(product.sku),
    barcode: product.barcode ? String(product.barcode) : undefined,
    name: String(product.name),
    stock: Number(product.stock),
    reorderLevel: Number(product.reorderLevel),
    isActive: Boolean(product.isActive),
  };
}

function serializeTopProduct(product: any): SerializedTopProduct {
  return {
    productId: Number(product.productId),
    sku: String(product.sku),
    name: String(product.name),
    stock: product.stock !== undefined ? Number(product.stock) : undefined,
    isActive: product.isActive !== undefined ? Boolean(product.isActive) : undefined,
    quantitySold: Number(product.quantitySold),
    revenue: Number(product.revenue),
    cost: Number(product.cost),
    profit: Number(product.profit),
  };
}

function serializeShift(shift: any): SerializedShift {
  return {
    id: Number(shift.id),
    userId: shift.userId !== null ? Number(shift.userId) : null,
    userName: String(shift.userName),
    openingCash: Number(shift.openingCash),
    closingCash: shift.closingCash !== null ? Number(shift.closingCash) : null,
    actualCash: shift.actualCash !== null ? Number(shift.actualCash) : null,
    difference: shift.difference !== null ? Number(shift.difference) : null,
    status: String(shift.status),
    openedAt:
      shift.openedAt instanceof Date
        ? shift.openedAt.toISOString()
        : String(shift.openedAt),
    closedAt:
      shift.closedAt instanceof Date
        ? shift.closedAt.toISOString()
        : shift.closedAt
          ? String(shift.closedAt)
          : null,
  };
}

export async function buildReportSnapshot(range: DateRange): Promise<ReportSnapshot> {
  const db = prisma as any;

  const [
    allProducts,
    openShiftsCount,
    todaySales,
    recentSales,
    recentSalesWithItems,
    returnsList,
    expensesList,
    movements,
    currentShift,
  ] = await Promise.all([
    db.product.findMany({
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        stock: true,
        costPrice: true,
        sellPrice: true,
        reorderLevel: true,
        isActive: true,
      },
    }),
    db.cashShift.count({ where: { status: "open" } }),
    db.sale.findMany({
      where: {
        saleDate: {
          gte: startOfDay(),
        },
      },
      select: {
        id: true,
        total: true,
        profit: true,
      },
    }),
    db.sale.findMany({
      where: {
        saleDate: {
          gte: range.start,
          lte: range.end,
        },
      },
      include: { items: true },
      orderBy: { saleDate: "desc" },
      take: 10,
    }),
    db.sale.findMany({
      where: {
        saleDate: {
          gte: range.start,
          lte: range.end,
        },
      },
      include: { items: true },
    }),
    db.salesReturn.findMany({
      where: {
        returnDate: {
          gte: range.start,
          lte: range.end,
        },
      },
      include: {
        items: true,
        sale: {
          include: {
            items: true,
          },
        },
      },
      orderBy: { returnDate: "desc" },
    }),
    db.expense.findMany({
      where: {
        expenseDate: {
          gte: range.start,
          lte: range.end,
        },
      },
      orderBy: { expenseDate: "desc" },
    }),
    db.cashMovement.findMany({
      where: {
        createdAt: {
          gte: range.start,
          lte: range.end,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.cashShift.findFirst({
      where: { status: "open" },
      orderBy: { openedAt: "desc" },
    }),
  ]);

  const lowStockProductsRaw = allProducts
    .filter((product: any) => product.stock <= product.reorderLevel)
    .sort((a: any, b: any) => a.stock - b.stock || a.name.localeCompare(b.name))
    .slice(0, 10);

  const lowStockProducts = lowStockProductsRaw.map(serializeProduct);

  const inventoryRows = allProducts.map((product: any) => ({
    stock: Number(product.stock),
    costPrice: Number(product.costPrice),
    sellPrice: Number(product.sellPrice),
    reorderLevel: Number(product.reorderLevel),
    isActive: Boolean(product.isActive),
  }));

  const endingQty = inventoryRows.reduce((sum: number, row: any) => sum + row.stock, 0);
  const endingInventoryValue = inventoryRows.reduce(
    (sum: number, row: any) => sum + row.stock * row.costPrice,
    0
  );
  const endingInventorySellValue = inventoryRows.reduce(
    (sum: number, row: any) => sum + row.stock * row.sellPrice,
    0
  );
  const inventoryPotentialMargin = inventoryRows.reduce(
    (sum: number, row: any) => sum + row.stock * (row.sellPrice - row.costPrice),
    0
  );
  const inventoryLowStockCount = inventoryRows.filter(
    (row: any) => row.stock > 0 && row.stock <= row.reorderLevel
  ).length;
  const inventoryZeroStockCount = inventoryRows.filter((row: any) => row.stock <= 0).length;
  const inventoryActiveProducts = inventoryRows.filter((row: any) => row.isActive).length;
  const inventoryInactiveProducts = inventoryRows.filter((row: any) => !row.isActive).length;

  const grossRevenue = recentSalesWithItems.reduce(
    (sum: number, sale: any) => sum + Number(sale.total),
    0
  );
  const grossCOGS = recentSalesWithItems.reduce(
    (sum: number, sale: any) => sum + Number(sale.costTotal),
    0
  );
  const grossProfit = recentSalesWithItems.reduce(
    (sum: number, sale: any) => sum + Number(sale.profit),
    0
  );

  let refundAmount = 0;
  let returnedCost = 0;

  for (const ret of returnsList) {
    refundAmount += Number(ret.refundAmount);

    for (const retItem of ret.items) {
      const sourceItem = ret.sale.items.find(
        (saleItem: any) => saleItem.productId === retItem.productId
      );

      if (sourceItem) {
        returnedCost += Number(sourceItem.costPrice) * Number(retItem.quantity);
      }
    }
  }

  const cashExpenses = expensesList
    .filter((expense: any) => expense.paymentMethod === "cash")
    .reduce((sum: number, expense: any) => sum + Number(expense.amount), 0);

  const cardExpenses = expensesList
    .filter((expense: any) => expense.paymentMethod === "card")
    .reduce((sum: number, expense: any) => sum + Number(expense.amount), 0);

  const totalExpenses = cashExpenses + cardExpenses;

  const netRevenue = grossRevenue - refundAmount;
  const netCOGS = grossCOGS - returnedCost;
  const operatingProfit = netRevenue - netCOGS;
  const netProfit = operatingProfit - totalExpenses;

  const cashIn = movements
    .filter((movement: any) => movement.type === "IN")
    .reduce((sum: number, movement: any) => sum + Number(movement.amount), 0);

  const cashOut = movements
    .filter((movement: any) => movement.type === "OUT")
    .reduce((sum: number, movement: any) => sum + Number(movement.amount), 0);

  const netCash = cashIn - cashOut;
  const averageOrderValue = recentSalesWithItems.length
    ? grossRevenue / recentSalesWithItems.length
    : 0;
  const marginPercent = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

  type DailyAgg = {
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
  };

  const dailyMap = new Map<string, DailyAgg>();

  for (const sale of recentSalesWithItems) {
    const key = toDateKey(sale.saleDate);

    const entry =
      dailyMap.get(key) ??
      {
        date: key,
        salesCount: 0,
        revenueGross: 0,
        cogsGross: 0,
        grossProfit: 0,
        returnsCount: 0,
        refundAmount: 0,
        returnedCost: 0,
        expensesCount: 0,
        expensesCash: 0,
        expensesCard: 0,
        totalExpenses: 0,
        netProfit: 0,
      };

    entry.salesCount += 1;
    entry.revenueGross += Number(sale.total);
    entry.cogsGross += Number(sale.costTotal);
    entry.grossProfit += Number(sale.profit);

    dailyMap.set(key, entry);
  }

  for (const ret of returnsList) {
    const key = toDateKey(ret.returnDate);

    const entry =
      dailyMap.get(key) ??
      {
        date: key,
        salesCount: 0,
        revenueGross: 0,
        cogsGross: 0,
        grossProfit: 0,
        returnsCount: 0,
        refundAmount: 0,
        returnedCost: 0,
        expensesCount: 0,
        expensesCash: 0,
        expensesCard: 0,
        totalExpenses: 0,
        netProfit: 0,
      };

    let localReturnedCost = 0;

    for (const retItem of ret.items) {
      const sourceItem = ret.sale.items.find(
        (saleItem: any) => saleItem.productId === retItem.productId
      );

      if (sourceItem) {
        localReturnedCost += Number(sourceItem.costPrice) * Number(retItem.quantity);
      }
    }

    entry.returnsCount += 1;
    entry.refundAmount += Number(ret.refundAmount);
    entry.returnedCost += localReturnedCost;

    dailyMap.set(key, entry);
  }

  for (const expense of expensesList) {
    const key = toDateKey(expense.expenseDate);

    const entry =
      dailyMap.get(key) ??
      {
        date: key,
        salesCount: 0,
        revenueGross: 0,
        cogsGross: 0,
        grossProfit: 0,
        returnsCount: 0,
        refundAmount: 0,
        returnedCost: 0,
        expensesCount: 0,
        expensesCash: 0,
        expensesCard: 0,
        totalExpenses: 0,
        netProfit: 0,
      };

    const amount = Number(expense.amount);

    entry.expensesCount += 1;

    if (expense.paymentMethod === "cash") {
      entry.expensesCash += amount;
    } else {
      entry.expensesCard += amount;
    }

    entry.totalExpenses += amount;

    dailyMap.set(key, entry);
  }

  const dailyRows: SerializedDailyRow[] = Array.from(dailyMap.values())
    .map((row) => ({
      ...row,
      netProfit:
        row.grossProfit - row.refundAmount + row.returnedCost - row.totalExpenses,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const productMap = new Map<
    number,
    {
      productId: number;
      sku: string;
      name: string;
      quantitySold: number;
      revenue: number;
      cost: number;
      stock?: number;
      isActive?: boolean;
    }
  >();

  for (const sale of recentSalesWithItems) {
    for (const item of sale.items) {
      const entry =
        productMap.get(item.productId) ??
        {
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          quantitySold: 0,
          revenue: 0,
          cost: 0,
        };

      entry.quantitySold += Number(item.quantity);
      entry.revenue += Number(item.lineTotal);
      entry.cost += Number(item.costTotal);

      productMap.set(item.productId, entry);
    }
  }

  const topProductIds = Array.from(productMap.keys());

  const topProductsMaster = topProductIds.length
    ? await db.product.findMany({
        where: { id: { in: topProductIds } },
        select: {
          id: true,
          sku: true,
          name: true,
          stock: true,
          isActive: true,
        },
      })
    : [];

  const topProducts: SerializedTopProduct[] = [];
  for (const [productId, aggregate] of productMap.entries()) {
    const master = topProductsMaster.find((item: any) => item.id === productId);
    if (!master) continue;

    topProducts.push(
      serializeTopProduct({
        productId: master.id,
        sku: master.sku,
        name: master.name,
        stock: master.stock,
        isActive: master.isActive,
        quantitySold: aggregate.quantitySold,
        revenue: aggregate.revenue,
        cost: aggregate.cost,
        profit: aggregate.revenue - aggregate.cost,
      })
    );
  }

  topProducts.sort((a, b) => b.quantitySold - a.quantitySold);

  const expensesByCategoryMap = new Map<
    string,
    { category: string; amount: number; count: number }
  >();

  for (const expense of expensesList) {
    const category = String(expense.category);
    const entry =
      expensesByCategoryMap.get(category) ??
      {
        category,
        amount: 0,
        count: 0,
      };

    entry.amount += Number(expense.amount);
    entry.count += 1;

    expensesByCategoryMap.set(category, entry);
  }

  const expensesByCategory = Array.from(expensesByCategoryMap.values()).sort(
    (a, b) => b.amount - a.amount
  );

  let currentShiftSummary: CurrentShiftSummary | null = null;

  if (currentShift) {
    const shiftMovements = await db.cashMovement.findMany({
      where: { shiftId: currentShift.id },
    });

    const shiftCashIn = shiftMovements
      .filter((movement: any) => movement.type === "IN")
      .reduce((sum: number, movement: any) => sum + Number(movement.amount), 0);

    const shiftCashOut = shiftMovements
      .filter((movement: any) => movement.type === "OUT")
      .reduce((sum: number, movement: any) => sum + Number(movement.amount), 0);

    const expectedCash = Number(currentShift.openingCash) + shiftCashIn - shiftCashOut;
    const actualCash =
      currentShift.actualCash !== null
        ? Number(currentShift.actualCash)
        : expectedCash;
    const difference =
      currentShift.difference !== null
        ? Number(currentShift.difference)
        : actualCash - expectedCash;

    currentShiftSummary = {
      shift: serializeShift(currentShift),
      openingCash: Number(currentShift.openingCash),
      cashIn: shiftCashIn,
      cashOut: shiftCashOut,
      expectedCash,
      actualCash,
      difference,
    };
  }

  return {
    range: {
      startDate: range.start.toISOString(),
      endDate: range.end.toISOString(),
    },
    overview: {
      totalProducts: allProducts.length,
      activeProducts: allProducts.filter((product: any) => product.isActive).length,
      lowStockProducts: lowStockProducts.length,
      todaySalesCount: todaySales.length,
      todayRevenue: todaySales.reduce(
        (sum: number, sale: any) => sum + Number(sale.total),
        0
      ),
      todayProfit: todaySales.reduce(
        (sum: number, sale: any) => sum + Number(sale.profit),
        0
      ),
      returnsCount: returnsList.length,
      openShiftsCount,
    },
    inventory: {
      endingQty,
      endingInventoryValue,
      endingInventorySellValue,
      inventoryPotentialMargin,
      lowStockCount: inventoryLowStockCount,
      zeroStockCount: inventoryZeroStockCount,
      activeProducts: inventoryActiveProducts,
      inactiveProducts: inventoryInactiveProducts,
    },
    currentShiftSummary,
    recentSales: recentSales.map(serializeSale),
    recentReturns: returnsList.slice(0, 10).map(serializeReturn),
    recentExpenses: expensesList.slice(0, 10).map(serializeExpense),
    lowStockProducts,
    topProducts,
    expensesByCategory,
    totals: {
      salesCount: recentSalesWithItems.length,
      returnsCount: returnsList.length,
      expensesCount: expensesList.length,
      grossRevenue,
      grossCOGS,
      grossProfit,
      refundAmount,
      returnedCost,
      netRevenue,
      netCOGS,
      operatingProfit,
      totalExpenses,
      cashExpenses,
      cardExpenses,
      netProfit,
      cashIn,
      cashOut,
      netCash,
      averageOrderValue,
      marginPercent,
    },
    dailyRows,
  };
}