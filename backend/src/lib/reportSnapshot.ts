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

function parseExpenseMeta(note: unknown): {
  expenseNumber?: string;
  category?: string;
  description?: string;
  createdBy?: string;
  paymentMethod?: "cash" | "card";
  expenseDate?: string;
  shiftId?: number | null;
} {
  if (typeof note !== "string" || !note.trim()) {
    return {};
  }

  const trimmed = note.trim();

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return {
      expenseNumber: parsed.expenseNumber ? String(parsed.expenseNumber) : undefined,
      category: parsed.category ? String(parsed.category) : undefined,
      description: parsed.description ? String(parsed.description) : undefined,
      createdBy: parsed.createdBy ? String(parsed.createdBy) : undefined,
      paymentMethod:
        parsed.paymentMethod === "card" ? "card" : parsed.paymentMethod === "cash" ? "cash" : undefined,
      expenseDate: parsed.expenseDate ? String(parsed.expenseDate) : undefined,
      shiftId:
        parsed.shiftId === null || parsed.shiftId === undefined
          ? null
          : Number(parsed.shiftId),
    };
  } catch {
    // fallback formats:
    // "EXP-123 | General | Administrator"
    // "Expense EXP-123"
    const parts = trimmed
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 3) {
      return {
        expenseNumber: parts[0],
        category: parts[1],
        createdBy: parts[2],
      };
    }

    const numberMatch = trimmed.match(/EXP[-\w\d]+/i);
    return {
      expenseNumber: numberMatch ? numberMatch[0] : undefined,
      category: "General",
      description: trimmed,
      createdBy: "System",
    };
  }
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
  const meta = parseExpenseMeta(expense.note);

  const expenseDate =
    meta.expenseDate ??
    (expense.createdAt instanceof Date
      ? expense.createdAt.toISOString()
      : String(expense.createdAt ?? expense.expenseDate ?? new Date().toISOString()));

  return {
    id: Number(expense.id),
    expenseNumber: meta.expenseNumber ?? String(expense.expenseNumber ?? `EXP-${expense.id}`),
    expenseDate,
    category: meta.category ?? String(expense.category ?? "General"),
    description: meta.description ?? String(expense.description ?? expense.note ?? ""),
    amount: Number(expense.amount),
    paymentMethod: (meta.paymentMethod ??
      (expense.type === "OUT" ? "cash" : "cash")) as "cash" | "card",
    shiftId:
      meta.shiftId !== undefined
        ? meta.shiftId
        : expense.shiftId !== null && expense.shiftId !== undefined
          ? Number(expense.shiftId)
          : null,
    createdBy: meta.createdBy ?? String(expense.createdBy ?? "System"),
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
    returnRecords,
    movementRecords,
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

  const expensesList = movementRecords
    .filter((movement: any) => movement.type === "OUT")
    .map((movement: any) => ({
      ...movement,
      ...parseExpenseMeta(movement.note),
    }));

  const lowStockProductsRaw = allProducts
    .filter((productRow: any) => productRow.stock <= productRow.reorderLevel)
    .sort((a: any, b: any) => a.stock - b.stock || a.name.localeCompare(b.name))
    .slice(0, 10);

  const lowStockProducts = lowStockProductsRaw.map(serializeProduct);

  const inventoryRows = allProducts.map((productRow: any) => ({
    stock: Number(productRow.stock),
    costPrice: Number(productRow.costPrice),
    sellPrice: Number(productRow.sellPrice),
    reorderLevel: Number(productRow.reorderLevel),
    isActive: Boolean(productRow.isActive),
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
    (sum: number, saleRow: any) => sum + Number(saleRow.total),
    0
  );
  const grossCOGS = recentSalesWithItems.reduce(
    (sum: number, saleRow: any) => sum + Number(saleRow.costTotal),
    0
  );
  const grossProfit = recentSalesWithItems.reduce(
    (sum: number, saleRow: any) => sum + Number(saleRow.profit),
    0
  );

  let refundAmount = 0;
  let returnedCost = 0;

  for (const ret of returnRecords) {
    refundAmount += Number(ret.refundAmount);

    const retItems = ret.items ?? [];
    const saleItems = ret.sale?.items ?? [];

    for (const retItem of retItems) {
      const sourceItem = saleItems.find(
        (saleItem: any) => saleItem.productId === retItem.productId
      );

      if (sourceItem) {
        returnedCost += Number(sourceItem.costPrice) * Number(retItem.quantity);
      }
    }
  }

  const cashExpenses = expensesList
    .filter((item: any) => item.paymentMethod === "cash")
    .reduce((sum: number, item: any) => sum + Number(item.amount), 0);

  const cardExpenses = expensesList
    .filter((item: any) => item.paymentMethod === "card")
    .reduce((sum: number, item: any) => sum + Number(item.amount), 0);

  const totalExpenses = cashExpenses + cardExpenses;

  const netRevenue = grossRevenue - refundAmount;
  const netCOGS = grossCOGS - returnedCost;
  const operatingProfit = netRevenue - netCOGS;
  const netProfit = operatingProfit - totalExpenses;

  const cashIn = movementRecords
    .filter((movement: any) => movement.type === "IN")
    .reduce((sum: number, movement: any) => sum + Number(movement.amount), 0);

  const cashOut = movementRecords
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

  for (const saleRecord of recentSalesWithItems) {
    const key = toDateKey(saleRecord.saleDate);

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
    entry.revenueGross += Number(saleRecord.total);
    entry.cogsGross += Number(saleRecord.costTotal);
    entry.grossProfit += Number(saleRecord.profit);

    dailyMap.set(key, entry);
  }

  for (const ret of returnRecords) {
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

    const retItems = ret.items ?? [];
    const saleItems = ret.sale?.items ?? [];

    for (const retItem of retItems) {
      const sourceItem = saleItems.find(
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

  for (const expenseRecord of expensesList) {
    const key = toDateKey(expenseRecord.createdAt ?? expenseRecord.expenseDate ?? new Date());

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

    const amount = Number(expenseRecord.amount);

    entry.expensesCount += 1;

    if (expenseRecord.paymentMethod === "card") {
      entry.expensesCard += amount;
    } else {
      entry.expensesCash += amount;
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

  for (const saleRecord of recentSalesWithItems) {
    for (const item of saleRecord.items ?? []) {
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

  for (const expenseRecord of expensesList) {
    const meta = parseExpenseMeta(expenseRecord.note);
    const category = String(meta.category ?? "General");
    const entry =
      expensesByCategoryMap.get(category) ??
      {
        category,
        amount: 0,
        count: 0,
      };

    entry.amount += Number(expenseRecord.amount);
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
      activeProducts: allProducts.filter((productRow: any) => productRow.isActive).length,
      lowStockProducts: lowStockProducts.length,
      todaySalesCount: todaySales.length,
      todayRevenue: todaySales.reduce(
        (sum: number, saleRow: any) => sum + Number(saleRow.total),
        0
      ),
      todayProfit: todaySales.reduce(
        (sum: number, saleRow: any) => sum + Number(saleRow.profit),
        0
      ),
      returnsCount: returnRecords.length,
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
    recentReturns: returnRecords.slice(0, 10).map(serializeReturn),
    recentExpenses: expensesList.slice(0, 10).map(serializeExpense),
    lowStockProducts,
    topProducts,
    expensesByCategory,
    totals: {
      salesCount: recentSalesWithItems.length,
      returnsCount: returnRecords.length,
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