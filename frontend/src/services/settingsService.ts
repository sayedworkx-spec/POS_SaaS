import type { AppSettings } from "../types/Settings";

const SETTINGS_KEY = "app_settings";

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
    storeName: String(raw.storeName ?? DEFAULT_SETTINGS.storeName).trim() || DEFAULT_SETTINGS.storeName,
    currencySymbol:
      String(raw.currencySymbol ?? DEFAULT_SETTINGS.currencySymbol).trim() ||
      DEFAULT_SETTINGS.currencySymbol,
    vatRate: Number(raw.vatRate ?? DEFAULT_SETTINGS.vatRate),
    lowStockThreshold: Number(raw.lowStockThreshold ?? DEFAULT_SETTINGS.lowStockThreshold),
    receiptFooter:
      String(raw.receiptFooter ?? DEFAULT_SETTINGS.receiptFooter).trim() ||
      DEFAULT_SETTINGS.receiptFooter,
    autoPrintReceipt: raw.autoPrintReceipt ?? DEFAULT_SETTINGS.autoPrintReceipt,
    showCostOnReceipt: raw.showCostOnReceipt ?? DEFAULT_SETTINGS.showCostOnReceipt,
  };
}

function readSettings(): AppSettings {
  const raw = localStorage.getItem(SETTINGS_KEY);

  if (!raw) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const normalized = normalizeSettings(parsed);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getSettings(): AppSettings {
  return readSettings();
}

export function saveSettings(settings: AppSettings) {
  const normalized = normalizeSettings(settings);
  writeSettings(normalized);
  return normalized;
}

export function resetSettings() {
  writeSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export function getDefaultSettings() {
  return DEFAULT_SETTINGS;
}