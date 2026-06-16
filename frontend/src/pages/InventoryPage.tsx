import MainLayout from "../layouts/MainLayout";

import {
  getInventoryMovements,
} from "../services/inventoryMovementService";

export default function InventoryPage() {

  const movements =
    getInventoryMovements();

  return (
    <MainLayout>

      <h1 className="text-3xl font-bold mb-6">
        Inventory Movements
      </h1>

      <div className="bg-white rounded-xl shadow">

        <table className="w-full">

          <thead>

            <tr className="bg-slate-100">

              <th className="p-4">
                Product ID
              </th>

              <th className="p-4">
                Type
              </th>

              <th className="p-4">
                Quantity
              </th>

              <th className="p-4">
                Date
              </th>

            </tr>

          </thead>

          <tbody>

            {movements.map(
              (movement) => (

                <tr
                  key={movement.id}
                  className="border-t"
                >

                  <td className="p-4">
                    {movement.productId}
                  </td>

                  <td className="p-4">
                    {movement.movementType}
                  </td>

                  <td className="p-4">
                    {movement.quantity}
                  </td>

                  <td className="p-4">
                    {movement.movementDate}
                  </td>

                </tr>

              )
            )}

          </tbody>

        </table>

      </div>

    </MainLayout>
  );
}