import { useEffect, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { addAuditLog } from "../services/auditService";
import {
  getSettings,
  resetSettings,
  saveSettings,
} from "../services/settingsService";
import { getCurrentUser } from "../services/authService";

import type { AppSettings } from "../types/Settings";

export default function SettingsPage() {
  const currentUser = getCurrentUser();
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  function handleSave() {
    const saved = saveSettings(settings);

    addAuditLog(
      "SETTINGS_UPDATED",
      `Store: ${saved.storeName}, Currency: ${saved.currencySymbol}, VAT: ${saved.vatRate}%`,
      currentUser?.name ?? "Admin"
    );

    setSettings(saved);
    alert("Settings saved");
  }

  function handleReset() {
    const ok = window.confirm("Reset settings to default?");
    if (!ok) return;

    const defaults = resetSettings();
    setSettings(defaults);

    addAuditLog(
      "SETTINGS_RESET",
      "Settings reset to defaults",
      currentUser?.name ?? "Admin"
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Store configuration and receipt options
          </p>
        </div>

        <div className="rounded-xl bg-white px-4 py-3 shadow">
          <div className="text-xs text-slate-500">Current User</div>
          <div className="font-bold mt-1">{currentUser?.name ?? "Admin"}</div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-5 text-xl font-bold">General Settings</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium">Store Name</label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) =>
                  setSettings((current) => ({ ...current, storeName: e.target.value }))
                }
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Currency Symbol</label>
              <input
                type="text"
                value={settings.currencySymbol}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    currencySymbol: e.target.value,
                  }))
                }
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">VAT %</label>
              <input
                type="number"
                min={0}
                value={settings.vatRate}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    vatRate: Number(e.target.value),
                  }))
                }
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Low Stock Threshold
              </label>
              <input
                type="number"
                min={0}
                value={settings.lowStockThreshold}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    lowStockThreshold: Number(e.target.value),
                  }))
                }
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Receipt Footer
              </label>
              <textarea
                value={settings.receiptFooter}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    receiptFooter: e.target.value,
                  }))
                }
                className="min-h-[120px] w-full rounded-xl border p-3"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-5 text-xl font-bold">Receipt / POS Options</h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <div className="font-medium">Auto Print Receipt</div>
                <div className="text-sm text-slate-500">
                  Open print dialog after checkout
                </div>
              </div>

              <input
                type="checkbox"
                checked={settings.autoPrintReceipt}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    autoPrintReceipt: e.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <div className="font-medium">Show Cost on Receipt</div>
                <div className="text-sm text-slate-500">
                  Useful for internal / admin receipts only
                </div>
              </div>

              <input
                type="checkbox"
                checked={settings.showCostOnReceipt}
                onChange={(e) =>
                  setSettings((current) => ({
                    ...current,
                    showCostOnReceipt: e.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
            </label>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm text-slate-500">Preview</div>
              <div className="mt-2 text-lg font-bold">{settings.storeName}</div>
              <div className="mt-1 text-sm text-slate-600">
                VAT: {settings.vatRate}% • Low stock: {settings.lowStockThreshold}
              </div>
              <div className="mt-3 text-sm text-slate-600">
                {settings.receiptFooter}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Save Settings
              </button>

              <button
                onClick={handleReset}
                className="rounded-xl border px-4 py-3 font-semibold"
              >
                Reset
              </button>
            </div>

            <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">
              Defaults are stored in localStorage. No backend is required yet.
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}