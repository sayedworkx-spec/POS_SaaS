import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { readJsonFile, writeJsonFile } from "../lib/jsonStore.js";

export const purchasesRouter = Router();

type Purchase = {
  id: number;
  productId: number;
  quantity: number;
  unitCost: number;
  purchaseDate: string;
};

const FILE_NAME = "purchases.json";

const purchaseSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive(),
  unitCost: z.coerce.number().min(0),
  purchaseDate: z.string().min(1),
});

function canManage(role?: string) {
  return role === "admin" || role === "warehouse";
}

async function readPurchases(): Promise<Purchase[]> {
  const purchases = await readJsonFile<Purchase[]>(FILE_NAME, []);
  if (!Array.isArray(purchases)) {
    await writeJsonFile(FILE_NAME, []);
    return [];
  }

  return purchases.map((item) => ({
    id: Number(item.id),
    productId: Number(item.productId),
    quantity: Number(item.quantity),
    unitCost: Number(item.unitCost),
    purchaseDate: String(item.purchaseDate),
  }));
}

async function writePurchases(purchases: Purchase[]) {
  await writeJsonFile(FILE_NAME, purchases);
}

purchasesRouter.use(requireAuth);

purchasesRouter.get("/", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const purchases = await readPurchases();
    purchases.sort(
      (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    );

    res.json({ purchases });
  } catch (error) {
    next(error);
  }
});

purchasesRouter.post("/", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const data = purchaseSchema.parse(req.body);

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { id: true, name: true, stock: true },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const purchase: Purchase = {
      id: Date.now(),
      productId: data.productId,
      quantity: data.quantity,
      unitCost: data.unitCost,
      purchaseDate: data.purchaseDate,
    };

    const purchases = await readPurchases();
    purchases.unshift(purchase);
    await writePurchases(purchases);

    await prisma.product.update({
      where: { id: product.id },
      data: {
        stock: { increment: data.quantity },
        costPrice: data.unitCost,
      },
    });

    res.status(201).json({ purchase });
  } catch (error) {
    next(error);
  }
});

purchasesRouter.delete("/:id", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const id = Number(req.params.id);
    const purchases = await readPurchases();
    const nextPurchases = purchases.filter((item) => item.id !== id);

    await writePurchases(nextPurchases);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});