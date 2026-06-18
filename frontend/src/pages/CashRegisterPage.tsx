import { useEffect, useMemo, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { addAuditLog } from "../services/auditService";
import { getCurrentUser } from "../services/authService";
import {
  addCashMovement,
  closeCashShift,
  getCashShifts,
  getCurrentShift,
  getShiftSummary,
  openCashShift,
  syncCashRegisterCache,
} from "../services/cashRegisterService";

import type { CashMovementType, CashRegisterSummary, CashShift } from "../types/CashRegister";

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

export default function CashRegisterPage() {
  const currentUser = getCurrentUser();

  const [currentShift, setCurrentShift] = useState<CashShift | null>(() => getCurrentShift());
  const [shifts, setShifts] = useState<CashShift[]>(() => getCashShifts());
  const [summary, setSummary] = useState<CashRegisterSummary | null>(() =>
    currentShift ? getShiftSummary(currentShift.id) : null
  );

  const [openingCash, setOpeningCash] = useState(0);
  const [actualCash, setActualCash] = useState(0);
  const [movementType, setMovementType] = useState<CashMovementType>("IN");
  const [movementAmount, setMovementAmount] = useState(0);
  const [movementNote, setMovementNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function refreshAll() {
    try {
      const snapshot = await syncCashRegisterCache();
      setCurrentShift(snapshot.currentShift);
      setShifts(getCashShifts());
      setSummary(snapshot.summary ?? null);

      if (snapshot.summary) {
        setActualCash(snapshot.summary.actualCash);
      } else if (snapshot.currentShift) {
        setActualCash(snapshot.currentShift.openingCash);
      }
    } catch {
      setCurrentShift(getCurrentShift());
      setShifts(getCashShifts());
      setSummary(currentShift ? getShiftSummary(currentShift.id) : null);
    }
  }

  useEffect(() => {
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const movements = useMemo(() => {
    return summary?.movements ?? [];
  }, [summary]);

  const cashInTotal = summary?.cashIn ?? 0;
  const cashOutTotal = summary?.cashOut ?? 0;
  const expectedCash = summary?.expectedCash ?? currentShift?.openingCash ?? 0;
  const difference = summary?.difference ?? 0;

  async function handleOpenShift() {
    try {
      setSaving(true);
      setError("");

      const result = await openCashShift(openingCash);
      setCurrentShift(result.shift);
      setSummary(result.summary);
      await refreshAll();

      addAuditLog(
        "SHIFT_OPENED",
        `Opening cash ${openingCash}`,
        currentUser?.name ?? "Cashier"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open shift");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMovement() {
    if (!currentShift) return;

    try {
      setSaving(true);
      setError("");

      await addCashMovement(
        movementType,
        movementAmount,
        movementNote || `${movementType === "IN" ? "Cash in" : "Cash out"}`,
        currentShift.id
      );

      setMovementAmount(0);
      setMovementNote("");
      await refreshAll();

      addAuditLog(
        movementType === "IN" ? "CASH_IN" : "CASH_OUT",
        `${movementType} ${movementAmount} - ${movementNote || "No note"}`,
        currentUser?.name ?? "Cashier"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save movement");
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseShift() {
    if (!currentShift) return;

    try {
      setSaving(true);
      setError("");

      const result = await closeCashShift(currentShift.id, actualCash);
      setCurrentShift(result.shift);
      setSummary(result.summary);
      await refreshAll();

      addAuditLog(
        "SHIFT_CLOSED",
        `Actual cash ${actualCash}`,
        currentUser?.name ?? "Cashier"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to close shift");
    } finally {
      setSaving(false);
    }
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Cash Register</h1>
          <p className="text-sm text-slate-500 mt-1">
            Open shift, cash in/out, and close the drawer
          </p>
          {currentUser && (
            <div className="mt-2 text-xs text-slate-400">
              Signed in as {currentUser.name} ({currentUser.role})
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Opening</div>
            <div className="mt-1 text-xl font-bold">{formatMoney(currentShift?.openingCash ?? 0)}</div>
          </div>

          <div className="rounded-2xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Cash In</div>
            <div className="mt-1 text-xl font-bold text-emerald-600">
              {formatMoney(cashInTotal)}
            </div>
          </div>

          <div className="rounded-2xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Cash Out</div>
            <div className="mt-1 text-xl font-bold text-red-600">
              {formatMoney(cashOutTotal)}
            </div>
          </div>

          <div className="rounded-2xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Expected</div>
            <div className="mt-1 text-xl font-bold">
              {formatMoney(expectedCash)}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!currentShift ? (
        <section className="rounded-2xl bg-white p-6 shadow max-w-xl">
          <h2 className="text-xl font-bold">Open New Shift</h2>
          <p className="mt-1 text-sm text-slate-500">
            Start the day with opening cash in the drawer.
          </p>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium">Opening Cash</label>
            <input
              type="number"
              min={0}
              value={openingCash}
              onChange={(e) => setOpeningCash(Number(e.target.value))}
              className="w-full rounded-xl border p-3"
            />
          </div>

          <button
            onClick={handleOpenShift}
            disabled={saving}
            className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Opening..." : "Open Shift"}
          </button>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Current Shift</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Opened by {currentShift.userName} • {formatDate(currentShift.openedAt)}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    currentShift.status === "open"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {currentShift.status.toUpperCase()}
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Expected Cash</div>
                  <div className="mt-1 text-xl font-bold">
                    {formatMoney(expectedCash)}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Actual Cash</div>
                  <input
                    type="number"
                    min={0}
                    value={actualCash}
                    onChange={(e) => setActualCash(Number(e.target.value))}
                    className="mt-2 w-full rounded-lg border p-2"
                  />
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">Difference</div>
                  <div
                    className={`mt-1 text-xl font-bold ${
                      difference === 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {formatMoney(difference)}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => setActualCash(expectedCash)}
                  className="rounded-xl border px-4 py-3 font-semibold"
                >
                  Set Actual = Expected
                </button>

                <button
                  onClick={handleCloseShift}
                  disabled={saving}
                  className="rounded-xl bg-red-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Closing..." : "Close Shift"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="text-xl font-bold">Cash Movement</h2>
              <p className="mt-1 text-sm text-slate-500">
                Record cash in or cash out during the shift
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">Type</label>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value as CashMovementType)}
                    className="w-full rounded-xl border p-3"
                  >
                    <option value="IN">Cash In</option>
                    <option value="OUT">Cash Out</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Amount</label>
                  <input
                    type="number"
                    min={0}
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(Number(e.target.value))}
                    className="w-full rounded-xl border p-3"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="mb-2 block text-sm font-medium">Note</label>
                  <input
                    type="text"
                    value={movementNote}
                    onChange={(e) => setMovementNote(e.target.value)}
                    className="w-full rounded-xl border p-3"
                    placeholder="Reason for movement"
                  />
                </div>
              </div>

              <button
                onClick={handleAddMovement}
                disabled={saving}
                className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Movement"}
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Shift Movements</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Latest cash register actions
                  </p>
                </div>

                <span className="text-xs text-slate-500">
                  {movements.length} records
                </span>
              </div>

              <div className="mt-5 max-h-[32rem] space-y-3 overflow-auto pr-1">
                {movements.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-slate-500">
                    No movements yet
                  </div>
                ) : (
                  movements.map((movement) => (
                    <div key={movement.id} className="rounded-xl border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">
                            {movement.type === "IN" ? "Cash In" : "Cash Out"}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {movement.note}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {formatDate(movement.createdAt)}
                          </div>
                        </div>

                        <div
                          className={`font-bold ${
                            movement.type === "IN"
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {movement.type === "IN" ? "+" : "-"}
                          {formatMoney(movement.amount)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="text-xl font-bold">Shift History</h2>
              <div className="mt-4 space-y-3">
                {shifts.length === 0 ? (
                  <div className="text-sm text-slate-500">No shifts found</div>
                ) : (
                  shifts.map((shift) => (
                    <div key={shift.id} className="rounded-xl border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">Shift #{shift.id}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {formatDate(shift.openedAt)}
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            shift.status === "open"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {shift.status}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        Opening {formatMoney(shift.openingCash)} •
                        {shift.closedAt ? ` Closed ${formatDate(shift.closedAt)}` : " Still open"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </MainLayout>
  );
}