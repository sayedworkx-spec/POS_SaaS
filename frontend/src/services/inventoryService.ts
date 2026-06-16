import type { InventoryMovement } from "../types/InventoryMovement";

export const inventoryMovements: InventoryMovement[] = [
  {
    id: 1,
    productId: 1,
    movementType: "IN",
    quantity: 100,
    movementDate: "2026-06-14",
  },

  {
    id: 2,
    productId: 1,
    movementType: "OUT",
    quantity: 20,
    movementDate: "2026-06-14",
  },

  {
    id: 3,
    productId: 1,
    movementType: "OUT",
    quantity: 10,
    movementDate: "2026-06-14",
  },
];
