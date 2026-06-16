import type { InventoryMovement }
from "../types/InventoryMovement";

const STORAGE_KEY =
  "inventory_movements";

export function getInventoryMovements():
InventoryMovement[] {

  const data =
    localStorage.getItem(
      STORAGE_KEY
    );

  if (!data) {
    return [];
  }

  return JSON.parse(data);
}

export function saveInventoryMovement(
  movement: InventoryMovement
) {
  const movements =
    getInventoryMovements();

  movements.push(movement);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(movements)
  );
}
