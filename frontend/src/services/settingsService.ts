import { apiFetch, readApiError } from "./api";
import type { AppSettings } from "../types/Settings";

const SETTINGS_CACHE_KEY = "settings_cache";

const DEFAULT_SETTINGS: AppSettings = {
  storeName: "POS SaaS",
  currencySymbol: "$",
  vatRate: 0,
  lowStockThreshold: 10,
  receiptFooter: "Thank you for your business",
  autoPrintReceipt: false,
  showCostOnReceipt: false,
};

function normalizeSettings(raw: Partial<AppSettings>): AppSettings {
  return {
    storeName:
      String(raw.storeName ?? DEFAULT_SETTINGS.storeName).trim() ||
      DEFAULT_SETTINGS.storeName,
    currencySymbol:
      String(raw.currencySymbol ?? DEFAULT_SETTINGS.currencySymbol).trim() ||
      DEFAULT_SETTINGS.currencySymbol,
    vatRate: Number(raw.vatRate ?? DEFAULT_SETTINGS.vatRate),
    lowStockThreshold: Number(
      raw.lowStockThreshold ?? DEFAULT_SETTINGS.lowStockThreshold
    ),
    receiptFooter:
      String(raw.receiptFooter ?? DEFAULT_SETTINGS.receiptFooter).trim() ||
      DEFAULT_SETTINGS.receiptFooter,
    autoPrintReceipt: raw.autoPrintReceipt ?? DEFAULT_SETTINGS.autoPrintReceipt,
    showCostOnReceipt: raw.showCostOnReceipt ?? DEFAULT_SETTINGS.showCostOnReceipt,
  };
}

function readCache(): AppSettings | null {
  const raw = localStorage.getItem(SETTINGS_CACHE_KEY);

  if (!raw) return null;

  try {
    return normalizeSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return null;
  }
}

function writeCache(settings: AppSettings) {
  localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
}

export function getDefaultSettings() {
  return DEFAULT_SETTINGS;
}

export function getSettings(): AppSettings {
  return readCache() ?? DEFAULT_SETTINGS;
}

export async function syncSettingsCache() {
  const response = await apiFetch("/settings");

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { settings?: unknown };
  const settings = normalizeSettings(
    (payload.settings ?? {}) as Partial<AppSettings>
  );

  writeCache(settings);
  return settings;
}

export async function saveSettings(settings: AppSettings) {
  const normalized = normalizeSettings(settings);

  const response = await apiFetch("/settings", {
    method: "PUT",
    body: JSON.stringify(normalized),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { settings?: unknown };
  const saved = normalizeSettings((payload.settings ?? normalized) as Partial<AppSettings>);

  writeCache(saved);
  return saved;
}

export async function resetSettings() {
  return saveSettings(DEFAULT_SETTINGS);
}