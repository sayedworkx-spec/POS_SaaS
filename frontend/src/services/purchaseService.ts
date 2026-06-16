import type { Purchase } from "../types/Purchase";

import {
  updateProductStock
} from "./productService";

import {
  saveInventoryMovement
} from "./inventoryMovementService";

const PURCHASES_KEY = "purchases";

export function getPurchases(): Purchase[] {
  return JSON.parse(
    localStorage.getItem(
      PURCHASES_KEY
    ) || "[]"
  );
}

export function addPurchase(
  purchase: Omit<Purchase, "id">
) {
  const purchases =
    getPurchases();

  const newPurchase: Purchase = {
    id: Date.now(),
    ...purchase,
  };

  purchases.push(
    newPurchase
  );

  localStorage.setItem(
    PURCHASES_KEY,
    JSON.stringify(
      purchases
    )
  );

  updateProductStock(
    purchase.productId,
    purchase.quantity
  );

  saveInventoryMovement({
    id: Date.now(),
    productId:
      purchase.productId,
    movementType: "IN",
    quantity:
      purchase.quantity,
    movementDate:
      new Date().toISOString(),
  });

  return newPurchase;
}