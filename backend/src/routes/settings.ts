import { Router } from "express";
import { z } from "zod";

import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { readJsonFile, writeJsonFile } from "../lib/jsonStore.js";

export const settingsRouter = Router();

type AppSettings = {
  storeName: string;
  currencySymbol: string;
  vatRate: number;
  lowStockThreshold: number;
  receiptFooter: string;
  autoPrintReceipt: boolean;
  showCostOnReceipt: boolean;
};

const FILE_NAME = "settings.json";

const DEFAULT_SETTINGS: AppSettings = {
  storeName: "POS SaaS",
  currencySymbol: "$",
  vatRate: 0,
  lowStockThreshold: 10,
  receiptFooter: "Thank you for your business",
  autoPrintReceipt: false,
  showCostOnReceipt: false,
};

const settingsSchema = z.object({
  storeName: z.string().min(1),
  currencySymbol: z.string().min(1),
  vatRate: z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().int().min(0),
  receiptFooter: z.string().min(1),
  autoPrintReceipt: z.coerce.boolean(),
  showCostOnReceipt: z.coerce.boolean(),
});

function canManage(role?: string) {
  return role === "admin";
}

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
    autoPrintReceipt: Boolean(raw.autoPrintReceipt ?? DEFAULT_SETTINGS.autoPrintReceipt),
    showCostOnReceipt: Boolean(raw.showCostOnReceipt ?? DEFAULT_SETTINGS.showCostOnReceipt),
  };
}

async function readSettings(): Promise<AppSettings> {
  const settings = await readJsonFile<AppSettings>(FILE_NAME, DEFAULT_SETTINGS);
  return normalizeSettings(settings ?? DEFAULT_SETTINGS);
}

async function writeSettings(settings: AppSettings) {
  await writeJsonFile(FILE_NAME, settings);
}

settingsRouter.use(requireAuth);

settingsRouter.get("/", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const settings = await readSettings();
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

settingsRouter.put("/", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const data = settingsSchema.parse(req.body);
    const settings = normalizeSettings(data);
    await writeSettings(settings);

    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

settingsRouter.post("/reset", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await writeSettings(DEFAULT_SETTINGS);
    res.json({ settings: DEFAULT_SETTINGS });
  } catch (error) {
    next(error);
  }
});