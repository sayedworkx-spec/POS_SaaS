import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import { getCurrentUser } from "../services/authService";
import { getSales } from "../services/salesService";
import {
  addCashMovement,
  closeShift,
  getCashMovements,
  getCashShifts,
  getCurrentShift,
  openShift,
} from "../services/cashRegisterService";

type CashShift = {
  id: number;
  status: "open" | "closed";
  openingCash: number;
  openedAt: string;
  openedBy: string;
  closedAt?: string | null;
  closedBy?: string | null;
  closingCash?: number | null;
};

type CashMovement = {
  id: number;
  shiftId: number;
  type: "IN" | "OUT";
  amount: number;
  reason: string;
  createdAt: string;
  createdBy?: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isToday(dateString: string) {
  const value = new Date(dateString);
  const today = new Date();

  return value.toDateString() === today.toDateString();
}

export default function CashRegisterPage() {
  const currentUser = getCurrentUser();
  const [version, setVersion] = useState(0);

  const [openingCash, setOpeningCash] = useState(0);
  const [movementAmount, setMovementAmount] = useState(0);
  const [movementReason, setMovementReason] = useState("");
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [actualCash, setActualCash] = useState(0);

  const currentShift = useMemo<CashShift | null>(() => {
    return (getCurrentShift() as CashShift | null) ?? null;
  }, [version]);

  const shifts = useMemo<CashShift[]>(() => {
    return (getCashShifts() as CashShift[]).slice().reverse();
  }, [version]);

  const movements = useMemo<CashMovement[]>(() => {
    if (!currentShift) {
      return [];
    }

    return (getCashMovements() as CashMovement[])
      .filter((movement) => movement.shiftId === currentShift.id)
      .slice()
      .reverse();
  }, [version, currentShift?.id]);

  const shiftSales = useMemo(() => {
    if (!currentShift) {
      return [];
    }

    return getSales().filter((sale) => sale.shiftId === currentShift.id);
  }, [version, currentShift?.id]);

  const cashSalesTotal = useMemo(() => {
    return shiftSales
      .filter((sale) => sale.paymentMethod === "cash")
      .reduce((sum, sale) => sum + sale.total, 0);
  }, [shiftSales]);

  const cardSalesTotal = useMemo(() => {
    return shiftSales
      .filter((sale) => sale.paymentMethod === "card")
      .reduce((sum, sale) => sum + sale.total, 0);
  }, [shiftSales]);

  const cashInTotal = useMemo(() => {
    return movements
      .filter((movement) => movement.type === "IN")
      .reduce((sum, movement) => sum + movement.amount, 0);
  }, [movements]);

  const cashOutTotal = useMemo(() => {
    return movements
      .filter((movement) => movement.type === "OUT")
      .reduce((sum, movement) => sum + movement.amount, 0);
  }, [movements]);

  const expectedCash = useMemo(() => {
    if (!currentShift) {
      return 0;
    }

    return currentShift.openingCash + cashSalesTotal + cashInTotal - cashOutTotal;
  }, [currentShift, cashSalesTotal, cashInTotal, cashOutTotal]);

  const actualDifference = actualCash - expectedCash;

  const todayMovements = useMemo(() => {
    return (getCashMovements() as CashMovement[]).filter((movement) =>
      isToday(movement.createdAt)
    );
  }, [version]);

  const openShiftsCount = useMemo(() => {
    return shifts.filter((shift) => shift.status === "open").length;
  }, [shifts]);

  const recentClosedShifts = useMemo(() => {
    return shifts
      .filter((shift) => shift.status === "closed")
      .slice(0, 8);
  }, [shifts]);

  function refresh() {
    setVersion((current) => current + 1);
  }

  function handleOpenShift() {
    try {
      openShift(openingCash, currentUser?.name ?? "Cashier");
      setOpeningCash(0);
      refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to open shift");
    }
  }

  function handleAddMovement() {
    if (!currentShift) {
      alert("Open a shift first");
      return;
    }

    if (!movementReason.trim()) {
      alert("Movement reason is required");
      return;
    }

    if (movementAmount <= 0) {
      alert("Movement amount must be greater than zero");
      return;
    }

    try {
      addCashMovement(movementType, movementAmount, movementReason.trim());

      setMovementAmount(0);
      setMovementReason("");
      setMovementType("IN");
      refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to add movement");
    }
  }

  function handleCloseShift() {
    if (!currentShift) {
      alert("No open shift to close");
      return;
    }

    try {
      closeShift(actualCash, currentUser?.name ?? "Cashier");
      setActualCash(0);
      refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to close shift");
    }
  }

  function setActualCashToExpectedAmount() {
    setActualCash(expectedCash);
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Cash Register</h1>
          <p className="text-sm text-slate-500 mt-1">
            Open shifts, cash in/out, closing breakdown, and drawer control
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Open Shifts</div>
            <div className="font-bold mt-1">{openShiftsCount}</div>
          </div>

          <Link
            to="/profit-report"
            className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white"
          >
            Profit Report
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Shift Status</div>
          <div className="text-3xl font-bold mt-2">
            {currentShift ? "OPEN" : "CLOSED"}
          </div>
          <div className="text-sm text-slate-500 mt-2">
            {currentShift ? `Opened by ${currentShift.openedBy}` : "No active shift"}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Opening Cash</div>
          <div className="text-3xl font-bold mt-2">
            {formatMoney(currentShift?.openingCash ?? 0)}
          </div>
          <div className="text-sm text-slate-500 mt-2">
            {currentShift ? formatDate(currentShift.openedAt) : "—"}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Expected Cash</div>
          <div className="text-3xl font-bold mt-2">
            {formatMoney(expectedCash)}
          </div>
          <div className="text-sm text-slate-500 mt-2">
            Cash sales + cash in - cash out
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Today Movements</div>
          <div className="text-3xl font-bold mt-2">
            {todayMovements.length}
          </div>
          <div className="text-sm text-slate-500 mt-2">
            In / Out records today
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Cash Sales</div>
          <div className="text-3xl font-bold mt-2 text-emerald-600">
            {formatMoney(cashSalesTotal)}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Card Sales</div>
          <div className="text-3xl font-bold mt-2 text-blue-600">
            {formatMoney(cardSalesTotal)}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Cash In</div>
          <div className="text-3xl font-bold mt-2 text-emerald-600">
            {formatMoney(cashInTotal)}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-xs text-slate-500">Cash Out</div>
          <div className="text-3xl font-bold mt-2 text-red-600">
            {formatMoney(cashOutTotal)}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="space-y-6">
          {!currentShift ? (
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">Open New Shift</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Set opening cash before starting sales
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_auto] items-end">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Opening Cash
                  </label>

                  <input
                    type="number"
                    min={0}
                    value={openingCash}
                    onChange={(e) => setOpeningCash(Number(e.target.value))}
                    className="w-full border rounded-xl p-3"
                    placeholder="0"
                  />
                </div>

                <button
                  onClick={handleOpenShift}
                  className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
                >
                  Open Shift
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold">Current Shift Breakdown</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Live drawer summary for the open shift
                  </p>
                </div>

                <div className="text-sm text-slate-500">
                  Shift #{String(currentShift.id).slice(-6)}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Opening Cash</div>
                  <div className="text-2xl font-bold mt-2">
                    {formatMoney(currentShift.openingCash)}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Cash Sales</div>
                  <div className="text-2xl font-bold mt-2 text-emerald-600">
                    {formatMoney(cashSalesTotal)}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Cash In</div>
                  <div className="text-2xl font-bold mt-2 text-emerald-600">
                    {formatMoney(cashInTotal)}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Cash Out</div>
                  <div className="text-2xl font-bold mt-2 text-red-600">
                    {formatMoney(cashOutTotal)}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Expected Cash</div>
                  <div className="text-2xl font-bold mt-2">
                    {formatMoney(expectedCash)}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Card Sales</div>
                  <div className="text-2xl font-bold mt-2 text-blue-600">
                    {formatMoney(cardSalesTotal)}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Drawer Delta</div>
                  <div
                    className={`text-2xl font-bold mt-2 ${
                      actualDifference >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {formatMoney(actualDifference)}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] items-end">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Actual Cash Count
                  </label>

                  <input
                    type="number"
                    min={0}
                    value={actualCash}
                    onChange={(e) => setActualCash(Number(e.target.value))}
                    className="w-full border rounded-xl p-3"
                    placeholder="Count the drawer"
                  />
                </div>

                <button
                  type="button"
                  onClick={setActualCashToExpectedAmount}
                  className="rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  Full
                </button>

                <button
                  onClick={handleCloseShift}
                  className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800 md:col-start-3"
                >
                  Close Shift
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Add Cash Movement</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Manual cash in/out for drawer adjustments, refunds, or payouts
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Amount</label>
                <input
                  type="number"
                  min={0}
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(Number(e.target.value))}
                  className="w-full border rounded-xl p-3"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType("IN")}
                    className={`rounded-xl border px-4 py-3 font-medium ${
                      movementType === "IN"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    Cash In
                  </button>

                  <button
                    type="button"
                    onClick={() => setMovementType("OUT")}
                    className={`rounded-xl border px-4 py-3 font-medium ${
                      movementType === "OUT"
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    Cash Out
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Reason</label>
              <input
                type="text"
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                className="w-full border rounded-xl p-3"
                placeholder="e.g. refund, petty cash, petty purchase"
              />
            </div>

            <button
              onClick={handleAddMovement}
              className={`mt-5 w-full rounded-xl px-4 py-3 font-semibold text-white ${
                movementType === "IN"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
              disabled={!currentShift}
            >
              Save Movement
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Current Shift Movements</h2>
                <p className="text-sm text-slate-500 mt-1">
                  All cash movements in the active shift
                </p>
              </div>
            </div>

            <div className="max-h-[34rem] overflow-auto">
              {movements.length === 0 ? (
                <div className="p-6 text-slate-500">No movements yet</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-4 text-left">Type</th>
                      <th className="p-4 text-left">Amount</th>
                      <th className="p-4 text-left">Reason</th>
                      <th className="p-4 text-left">Time</th>
                    </tr>
                  </thead>

                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement.id} className="border-t">
                        <td className="p-4 font-semibold">
                          {movement.type === "IN" ? (
                            <span className="text-emerald-600">IN</span>
                          ) : (
                            <span className="text-red-600">OUT</span>
                          )}
                        </td>
                        <td className="p-4">{formatMoney(movement.amount)}</td>
                        <td className="p-4">{movement.reason}</td>
                        <td className="p-4 text-sm text-slate-500">
                          {formatDate(movement.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="p-5 border-b">
              <h2 className="text-xl font-bold">Recent Closed Shifts</h2>
              <p className="text-sm text-slate-500 mt-1">
                Closed shifts and drawer records
              </p>
            </div>

            <div className="max-h-[26rem] overflow-auto">
              {recentClosedShifts.length === 0 ? (
                <div className="p-6 text-slate-500">No closed shifts yet</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-4 text-left">Shift</th>
                      <th className="p-4 text-left">Opened</th>
                      <th className="p-4 text-left">Closed</th>
                      <th className="p-4 text-left">Opening</th>
                      <th className="p-4 text-left">Closing</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentClosedShifts.map((shift) => (
                      <tr key={shift.id} className="border-t">
                        <td className="p-4">
                          <div className="font-medium">
                            #{String(shift.id).slice(-6)}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {shift.openedBy}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-500">
                          {formatDate(shift.openedAt)}
                        </td>
                        <td className="p-4 text-sm text-slate-500">
                          {shift.closedAt ? formatDate(shift.closedAt) : "-"}
                        </td>
                        <td className="p-4">{formatMoney(shift.openingCash)}</td>
                        <td className="p-4">
                          {shift.closingCash === null || shift.closingCash === undefined
                            ? "-"
                            : formatMoney(shift.closingCash)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}


