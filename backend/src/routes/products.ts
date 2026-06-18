import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const productsRouter = Router();

const productSchema = z.object({
  sku: z.string().min(1),
  barcode: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.coerce.number().int().min(1),
  stock: z.coerce.number().int().min(0).default(0),
  costPrice: z.coerce.number().min(0),
  sellPrice: z.coerce.number().min(0),
  reorderLevel: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().optional().default(true),
});

const updateSchema = productSchema.partial();

const stockAdjustSchema = z.object({
  delta: z.coerce.number().int(),
});

function canManage(role?: string) {
  return role === "admin" || role === "warehouse";
}

function handlePrismaError(res: any, error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return res.status(409).json({
      message: "SKU or barcode already exists",
    });
  }

  return null;
}

productsRouter.use(requireAuth);

productsRouter.get("/", async (req: AuthRequest, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        categoryId: true,
        stock: true,
        costPrice: true,
        sellPrice: true,
        reorderLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ products });
  } catch (error) {
    next(error);
  }
});

productsRouter.get("/:id", async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        categoryId: true,
        stock: true,
        costPrice: true,
        sellPrice: true,
        reorderLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

productsRouter.post("/", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const data = productSchema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        sku: data.sku.trim(),
        barcode: data.barcode.trim(),
        name: data.name.trim(),
        categoryId: data.categoryId,
        stock: data.stock,
        costPrice: data.costPrice,
        sellPrice: data.sellPrice,
        reorderLevel: data.reorderLevel,
        isActive: data.isActive,
      },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        categoryId: true,
        stock: true,
        costPrice: true,
        sellPrice: true,
        reorderLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({ product });
  } catch (error) {
    const handled = handlePrismaError(res, error);
    if (handled) return handled;
    next(error);
  }
});

productsRouter.patch("/:id", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const id = Number(req.params.id);
    const data = updateSchema.parse(req.body);

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(data.sku !== undefined ? { sku: data.sku.trim() } : {}),
        ...(data.barcode !== undefined ? { barcode: data.barcode.trim() } : {}),
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.stock !== undefined ? { stock: data.stock } : {}),
        ...(data.costPrice !== undefined ? { costPrice: data.costPrice } : {}),
        ...(data.sellPrice !== undefined ? { sellPrice: data.sellPrice } : {}),
        ...(data.reorderLevel !== undefined
          ? { reorderLevel: data.reorderLevel }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        categoryId: true,
        stock: true,
        costPrice: true,
        sellPrice: true,
        reorderLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ product });
  } catch (error) {
    const handled = handlePrismaError(res, error);
    if (handled) return handled;
    next(error);
  }
});

productsRouter.delete("/:id", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const id = Number(req.params.id);

    await prisma.product.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

productsRouter.patch("/:id/toggle-status", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const id = Number(req.params.id);

    const current = await prisma.product.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!current) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = await prisma.product.update({
      where: { id },
      data: { isActive: !current.isActive },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        categoryId: true,
        stock: true,
        costPrice: true,
        sellPrice: true,
        reorderLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

productsRouter.patch("/:id/stock", async (req: AuthRequest, res, next) => {
  try {
    if (!canManage(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const id = Number(req.params.id);
    const { delta } = stockAdjustSchema.parse(req.body);

    const current = await prisma.product.findUnique({
      where: { id },
      select: { stock: true },
    });

    if (!current) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        stock: Math.max(0, current.stock + delta),
      },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        categoryId: true,
        stock: true,
        costPrice: true,
        sellPrice: true,
        reorderLevel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ product });
  } catch (error) {
    next(error);
  }
});