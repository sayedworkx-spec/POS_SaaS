import { getSales } from "./salesService";
import { updateProductStock } from "./productService";
import { addCashMovement } from "./cashRegisterService";
import { saveInventoryMovement } from "./inventoryMovementService";

import type { Sale } from "../types/Sale";
import type { SaleReturn, ReturnItem } from "../types/Return";

const RETURNS_KEY = "returns";

function normalizeReturn(raw: Record<string, unknown>): SaleReturn {
  const items: ReturnItem[] = Array.isArray(raw.items)
    ? raw.items.map((rawItem: unknown): ReturnItem => {
        const item = rawItem as Record<string, unknown>;
        const quantity = Number(item.quantity ?? 0);
        const unitPrice = Number(item.unitPrice ?? 0);
        const costPrice = Number(item.costPrice ?? 0);
        const refundAmount = Number(item.refundAmount ?? unitPrice * quantity);
        const costAmount = Number(item.costAmount ?? costPrice * quantity);

        return {
          productId: Number(item.productId ?? 0),
          sku: String(item.sku ?? "").trim(),
          name: String(item.name ?? "").trim(),
          quantity,
          unitPrice,
          costPrice,
          refundAmount,
          costAmount,
        };
      })
    : [];

  const refundAmount = Number(
    raw.refundAmount ??
      items.reduce((sum: number, item: ReturnItem) => sum + item.refundAmount, 0)
  );

  const costAmount = Number(
    raw.costAmount ??
      items.reduce((sum: number, item: ReturnItem) => sum + item.costAmount, 0)
  );

  return {
    id: Number(raw.id ?? Date.now()),
    returnNumber: String(raw.returnNumber ?? `RET-${Date.now()}`),
    returnDate: String(raw.returnDate ?? new Date().toISOString()),
    originalSaleId: Number(raw.originalSaleId ?? 0),
    originalInvoiceNumber: String(raw.originalInvoiceNumber ?? ""),
    cashier: String(raw.cashier ?? "Cashier"),
    paymentMethod: raw.paymentMethod === "card" ? "card" : "cash",
    reason: String(raw.reason ?? "").trim(),
    createdBy: String(raw.createdBy ?? "Admin").trim(),
    refundAmount,
    costAmount,
    profitImpact: Number(raw.profitImpact ?? refundAmount - costAmount),
    items,
  };
}

function readReturns(): SaleReturn[] {
  const raw = localStorage.getItem(RETURNS_KEY);

  if (!raw) {
    localStorage.setItem(RETURNS_KEY, JSON.stringify([]));
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      localStorage.setItem(RETURNS_KEY, JSON.stringify([]));
      return [];
    }

    const normalized = parsed.map((item) =>
      normalizeReturn(item as Record<string, unknown>)
    );

    localStorage.setItem(RETURNS_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    localStorage.setItem(RETURNS_KEY, JSON.stringify([]));
    return [];
  }
}

function writeReturns(returns: SaleReturn[]) {
  localStorage.setItem(RETURNS_KEY, JSON.stringify(returns));
}

export function getReturns(): SaleReturn[] {
  return readReturns();
}

export function getReturnByNumber(returnNumber: string): SaleReturn | null {
  const returns = readReturns();
  return returns.find((item) => item.returnNumber === returnNumber) ?? null;
}

export function getReturnedQuantityForItem(
  originalInvoiceNumber: string,
  productId: number
) {
  return readReturns().reduce((sum: number, record: SaleReturn) => {
    if (record.originalInvoiceNumber !== originalInvoiceNumber) {
      return sum;
    }

    return (
      sum +
      record.items
        .filter((item: ReturnItem) => item.productId === productId)
        .reduce((itemSum: number, item: ReturnItem) => itemSum + item.quantity, 0)
    );
  }, 0);
}

export function getReturnableQuantityForItem(sale: Sale, productId: number) {
  const soldQuantity =
    sale.items.find((item) => item.productId === productId)?.quantity ?? 0;

  const returnedQuantity = getReturnedQuantityForItem(
    sale.invoiceNumber,
    productId
  );

  return Math.max(0, soldQuantity - returnedQuantity);
}

type CreateReturnInput = {
  originalInvoiceNumber: string;
  reason: string;
  createdBy: string;
  items: Array<{
    productId: number;
    quantity: number;
  }>;
};

export function createReturn(input: CreateReturnInput) {
  const sales = getSales();
  const sale = sales.find(
    (item) => item.invoiceNumber === input.originalInvoiceNumber
  );

  if (!sale) {
    throw new Error("Sale not found");
  }

  if (!input.reason.trim()) {
    throw new Error("Return reason is required");
  }

  const requestedItems = input.items.filter((item) => item.quantity > 0);

  if (requestedItems.length === 0) {
    throw new Error("Select at least one item to return");
  }

  const processedItems: ReturnItem[] = requestedItems.map(
    (item): ReturnItem => {
      const soldItem = sale.items.find(
        (saleItem) => saleItem.productId === item.productId
      );

      if (!soldItem) {
        throw new Error("Return item not found in sale");
      }

      const alreadyReturned = getReturnedQuantityForItem(
        sale.invoiceNumber,
        item.productId
      );

      const availableToReturn = soldItem.quantity - alreadyReturned;

      if (availableToReturn <= 0) {
        throw new Error(`${soldItem.name} already returned بالكامل`);
      }

      if (item.quantity > availableToReturn) {
        throw new Error(
          `${soldItem.name} available to return is only ${availableToReturn}`
        );
      }

      const unitPrice = Number(soldItem.unitPrice);
      const costPrice = Number(soldItem.costPrice);
      const refundAmount = unitPrice * item.quantity;
      const costAmount = costPrice * item.quantity;

      return {
        productId: soldItem.productId,
        sku: soldItem.sku,
        name: soldItem.name,
        quantity: item.quantity,
        unitPrice,
        costPrice,
        refundAmount,
        costAmount,
      };
    }
  );

  const refundAmount = processedItems.reduce(
    (sum: number, item: ReturnItem) => sum + item.refundAmount,
    0
  );

  const costAmount = processedItems.reduce(
    (sum: number, item: ReturnItem) => sum + item.costAmount,
    0
  );

  processedItems.forEach((item: ReturnItem, index: number) => {
    updateProductStock(item.productId, item.quantity);

    saveInventoryMovement({
      id: Date.now() + item.productId + index,
      productId: item.productId,
      movementType: "IN",
      quantity: item.quantity,
      movementDate: new Date().toISOString(),
    });
  });

  if (sale.paymentMethod === "cash") {
    addCashMovement("OUT", refundAmount, `Return ${sale.invoiceNumber}`);
  }

  const returns = readReturns();

  const newReturn: SaleReturn = {
    id: Date.now(),
    returnNumber: `RET-${Date.now().toString().slice(-6)}`,
    returnDate: new Date().toISOString(),
    originalSaleId: sale.id,
    originalInvoiceNumber: sale.invoiceNumber,
    cashier: sale.cashier,
    paymentMethod: sale.paymentMethod,
    reason: input.reason.trim(),
    createdBy: input.createdBy.trim(),
    refundAmount,
    costAmount,
    profitImpact: refundAmount - costAmount,
    items: processedItems,
  };

  returns.push(newReturn);
  writeReturns(returns);

  return newReturn;
}