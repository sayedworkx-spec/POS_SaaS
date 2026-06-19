import { Router } from "express";
import { z } from "zod";

import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { readJsonFile, writeJsonFile } from "../lib/jsonStore.js";

export const suspendedSalesRouter = Router();

type SuspendedSaleItem = {
  productId: number;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  lineTotal: number;
  costTotal: number;
};

type SuspendedSale = {
  id: number;
  reference: string;
  createdAt: string;
  cashier: string;
  reason: string;
  paymentMethod: "cash" | "card";
  discountPercent: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  costTotal: number;
  items: SuspendedSaleItem[];
};

const FILE_NAME = "suspended-sales.json";

const itemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  sku: z.string().min(1),
  name: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  lineTotal: z.coerce.number().min(0),
  costTotal: z.coerce.number().min(0),
});

const suspendedSaleSchema = z.object({
  cashier: z.string().min(1),
  reason: z.string().optional(),
  paymentMethod: z.enum(["cash", "card"]),
  discountPercent: z.coerce.number().min(0),
  items: z.array(itemSchema).min(1),
});

function canManage(role?: string) {
  return role === "admin" || role === "cashier";
}

function normalizeSale(raw: Partial<SuspendedSale>): SuspendedSale {
  const items = Array.isArray(raw.items)
    ? raw.items.map((item) => ({
        productId: Number(item.productId),
        sku: String(item.sku),
        name: String(item.name),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        costPrice: Number(item.costPrice),
        lineTotal: Number(item.lineTotal),
        costTotal: Number(item.costTotal),
      }))
    : [];

  const subtotal = Number(
    raw.subtotal ??
      items.reduce((sum, item) => sum + item.lineTotal, 0)
  );
  const discountPercent = Number(raw.discountPercent ?? 0);
  const discountAmount = Number(
    raw.discountAmount ?? Math.round((subtotal * discountPercent) / 100)
  );
  const costTotal = Number(
    raw.costTotal ?? items.reduce((sum, item) => sum + item.costTotal, 0)
  );
  const total = Number(raw.total ?? Math.max(0, subtotal - discountAmount));

  return {
    id: Number(raw.id ?? Date.now()),
    reference: String(raw.reference ?? `HOLD-${Date.now().toString().slice(-6)}`),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    cashier: String(raw.cashier ?? "Cashier"),
    reason: String(raw.reason ?? "Held sale"),
    paymentMethod: raw.paymentMethod === "card" ? "card" : "cash",
    discountPercent,
    subtotal,
    discountAmount,
    total,
    costTotal,
    items,
  };
}

async function readSuspendedSales(): Promise<SuspendedSale[]> {
  const sales = await readJsonFile<SuspendedSale[]>(FILE_NAME, []);
  return Array.isArray(sales) ? sales.map((sale) => normalizeSale(sale)) : [];
}

async function writeSuspendedSales(sales: SuspendedSale[]) {
  await writeJsonFile(FILE_NAME, sales);
}

suspendedSalesRouter.use(requireAuth);

suspendedSalesRouter.get("/", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const suspendedSales = await readSuspendedSales();
    res.json({ suspendedSales });
  } catch (error) {
    next(error);
  }
});

suspendedSalesRouter.post("/", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const data = suspendedSaleSchema.parse(req.body);
    const items = data.items.map((item) => ({
      ...item,
      sku: item.sku.trim(),
      name: item.name.trim(),
    }));

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const discountAmount = Math.round((subtotal * data.discountPercent) / 100);
    const costTotal = items.reduce((sum, item) => sum + item.costTotal, 0);
    const total = Math.max(0, subtotal - discountAmount);

    const suspendedSale: SuspendedSale = {
      id: Date.now(),
      reference: `HOLD-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      cashier: data.cashier.trim(),
      reason: (data.reason ?? "Held sale").trim(),
      paymentMethod: data.paymentMethod,
      discountPercent: Number(data.discountPercent),
      subtotal,
      discountAmount,
      total,
      costTotal,
      items,
    };

    const suspendedSales = await readSuspendedSales();
    suspendedSales.unshift(suspendedSale);
    await writeSuspendedSales(suspendedSales);

    res.status(201).json({ suspendedSale });
  } catch (error) {
    next(error);
  }
});

suspendedSalesRouter.delete("/", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await writeSuspendedSales([]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

suspendedSalesRouter.delete("/:id", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const id = Number(req.params.id);
    const suspendedSales = await readSuspendedSales();
    const nextSales = suspendedSales.filter((sale) => sale.id !== id);

    await writeSuspendedSales(nextSales);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});