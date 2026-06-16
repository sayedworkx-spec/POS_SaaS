export interface InventoryMovement {

  id: number;

  productId: number;

  movementType:
    | "IN"
    | "OUT";

  quantity: number;

  movementDate: string;
}