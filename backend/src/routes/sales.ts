import { PaymentMethod, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const salesRouter = Router();

const saleItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  sku: z.string().min(1),
  name: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  lineTotal: z.coerce.number().min(0),
  costTotal: z.coerce.number().min(0),
});

const createSaleSchema = z.object({
  invoiceNumber: z.string().min(1),
  saleDate: z.string().datetime(),
  cashier: z.string().min(1),
  shiftId: z.coerce.number().int().min(1),
  paymentMethod: z.enum(["cash", "card"]),
  subtotal: z.coerce.number().min(0),
  costTotal: z.coerce.number().min(0),
  profit: z.coerce.number(),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0),
  cashReceived: z.coerce.number().min(0).default(0),
  change: z.coerce.number().min(0).default(0),
  items: z.array(saleItemSchema).min(1),
});

function canSell(role?: string) {
  return role === "admin" || role === "cashier";
}

function serializeSale(sale: any) {
  return {
    id: Number(sale.id),
    invoiceNumber: String(sale.invoiceNumber),
    saleDate:
      sale.saleDate instanceof Date
        ? sale.saleDate.toISOString()
        : String(sale.saleDate),
    cashier: String(sale.cashier),
    shiftId: Number(sale.shiftId),
    paymentMethod: sale.paymentMethod as "cash" | "card",
    subtotal: Number(sale.subtotal),
    costTotal: Number(sale.costTotal),
    profit: Number(sale.profit),
    discountPercent: Number(sale.discountPercent),
    discountAmount: Number(sale.discountAmount),
    total: Number(sale.total),
    cashReceived: Number(sale.cashReceived),
    change: Number(sale.change),
    items: Array.isArray(sale.items)
      ? sale.items.map((item: any) => ({
          id: Number(item.id),
          saleId: Number(item.saleId),
          productId: Number(item.productId),
          sku: String(item.sku),
          name: String(item.name),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          costPrice: Number(item.costPrice),
          lineTotal: Number(item.lineTotal),
          costTotal: Number(item.costTotal),
        }))
      : [],
    createdAt:
      sale.createdAt instanceof Date
        ? sale.createdAt.toISOString()
        : sale.createdAt
          ? String(sale.createdAt)
          : undefined,
    updatedAt:
      sale.updatedAt instanceof Date
        ? sale.updatedAt.toISOString()
        : sale.updatedAt
          ? String(sale.updatedAt)
          : undefined,
  };
}

salesRouter.use(requireAuth);

salesRouter.get("/", async (req: AuthRequest, res, next) => {
  try {
    const sales = await prisma.sale.findMany({
      orderBy: { saleDate: "desc" },
      include: { items: true },
    });

    res.json({ sales: sales.map(serializeSale) });
  } catch (error) {
    next(error);
  }
});

salesRouter.get("/:invoiceNumber", async (req: AuthRequest, res, next) => {
  try {
    const invoiceNumber = req.params.invoiceNumber;

    const sale = await prisma.sale.findUnique({
      where: { invoiceNumber },
      include: { items: true },
    });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    res.json({ sale: serializeSale(sale) });
  } catch (error) {
    next(error);
  }
});

salesRouter.post("/", async (req: AuthRequest, res, next) => {
  try {
    if (!canSell(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const data = createSaleSchema.parse(req.body);

    if (data.paymentMethod === "cash" && data.cashReceived < data.total) {
      return res
        .status(400)
        .json({ message: "Cash received is less than total" });
    }

    const existingSale = await prisma.sale.findUnique({
      where: { invoiceNumber: data.invoiceNumber },
      select: { id: true },
    });

    if (existingSale) {
      return res.status(409).json({ message: "Invoice number already exists" });
    }

    const sale = await prisma.$transaction(async (tx) => {
      const productIds = data.items.map((item) => item.productId);

      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          sku: true,
          name: true,
          stock: true,
          costPrice: true,
          sellPrice: true,
        },
      });

      if (products.length !== productIds.length) {
        const missingIds = productIds.filter(
          (id) => !products.some((product) => product.id === id)
        );
        throw new Error(`Product not found: ${missingIds.join(", ")}`);
      }

      for (const item of data.items) {
        const product = products.find((p) => p.id === item.productId);

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Not enough stock for ${product.name}`);
        }
      }

      const createdSale = await tx.sale.create({
        data: {
          invoiceNumber: data.invoiceNumber,
          saleDate: new Date(data.saleDate),
          cashier: data.cashier.trim(),
          shiftId: data.shiftId,
          paymentMethod: data.paymentMethod as PaymentMethod,
          subtotal: data.subtotal,
          costTotal: data.costTotal,
          profit: data.profit,
          discountPercent: data.discountPercent,
          discountAmount: data.discountAmount,
          total: data.total,
          cashReceived: data.cashReceived,
          change: data.change,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              sku: item.sku.trim(),
              name: item.name.trim(),
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              costPrice: item.costPrice,
              lineTotal: item.lineTotal,
              costTotal: item.costTotal,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      if (data.paymentMethod === "cash") {
        await tx.cashMovement.create({
          data: {
            shiftId: data.shiftId,
            type: "IN",
            amount: data.total,
            note: `Sale ${data.invoiceNumber}`,
          },
        });
      }

      return createdSale;
    });

    res.status(201).json({ sale: serializeSale(sale) });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.startsWith("Product not found") ||
        error.message.startsWith("Not enough stock")
      ) {
        return res.status(400).json({ message: error.message });
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({ message: "Invoice number already exists" });
    }

    next(error);
  }
});
