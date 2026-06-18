import { PaymentMethod, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const returnsRouter = Router();

const returnItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  sku: z.string().min(1),
  name: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().min(0),
  refundTotal: z.coerce.number().min(0),
});

const createReturnSchema = z.object({
  returnNumber: z.string().min(1),
  returnDate: z.string().datetime(),
  saleId: z.coerce.number().int().positive(),
  invoiceNumber: z.string().min(1),
  cashier: z.string().min(1),
  reason: z.string().min(1),
  refundMethod: z.enum(["cash", "card"]),
  subtotal: z.coerce.number().min(0),
  refundAmount: z.coerce.number().min(0),
  items: z.array(returnItemSchema).min(1),
});

function canReturn(role?: string) {
  return role === "admin" || role === "cashier";
}

function serializeReturnItem(item: any) {
  return {
    id: Number(item.id),
    returnId: Number(item.returnId),
    productId: Number(item.productId),
    sku: String(item.sku),
    name: String(item.name),
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    refundTotal: Number(item.refundTotal),
  };
}

function serializeReturn(ret: any) {
  return {
    id: Number(ret.id),
    returnNumber: String(ret.returnNumber),
    returnDate:
      ret.returnDate instanceof Date
        ? ret.returnDate.toISOString()
        : String(ret.returnDate),
    saleId: Number(ret.saleId),
    invoiceNumber: String(ret.invoiceNumber),
    cashier: String(ret.cashier),
    reason: String(ret.reason),
    refundMethod: ret.refundMethod as "cash" | "card",
    shiftId: ret.shiftId !== null ? Number(ret.shiftId) : null,
    subtotal: Number(ret.subtotal),
    refundAmount: Number(ret.refundAmount),
    items: Array.isArray(ret.items) ? ret.items.map(serializeReturnItem) : [],
    createdAt:
      ret.createdAt instanceof Date
        ? ret.createdAt.toISOString()
        : String(ret.createdAt),
    updatedAt:
      ret.updatedAt instanceof Date
        ? ret.updatedAt.toISOString()
        : String(ret.updatedAt),
  };
}

returnsRouter.use(requireAuth);

returnsRouter.get("/", async (req: AuthRequest, res, next) => {
  try {
    if (!canReturn(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const db = prisma as any;

    const returns = await db.salesReturn.findMany({
      orderBy: { returnDate: "desc" },
      include: { items: true },
    });

    res.json({ returns: returns.map(serializeReturn) });
  } catch (error) {
    next(error);
  }
});

returnsRouter.get("/:returnNumber", async (req: AuthRequest, res, next) => {
  try {
    if (!canReturn(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const returnNumber = req.params.returnNumber;
    const db = prisma as any;

    const salesReturn = await db.salesReturn.findUnique({
      where: { returnNumber },
      include: { items: true },
    });

    if (!salesReturn) {
      return res.status(404).json({ message: "Return not found" });
    }

    res.json({ salesReturn: serializeReturn(salesReturn) });
  } catch (error) {
    next(error);
  }
});

returnsRouter.post("/", async (req: AuthRequest, res, next) => {
  try {
    if (!canReturn(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const data = createReturnSchema.parse(req.body);
    const db = prisma as any;

    const created = await db.$transaction(async (tx: any) => {
      const sale = await tx.sale.findUnique({
        where: { id: data.saleId },
        include: { items: true },
      });

      if (!sale) {
        throw new Error("Sale not found");
      }

      const previousReturns = await tx.salesReturn.findMany({
        where: { saleId: sale.id },
        include: { items: true },
      });

      const soldQtyByProduct = new Map<number, number>();
      for (const item of sale.items) {
        soldQtyByProduct.set(
          item.productId,
          (soldQtyByProduct.get(item.productId) ?? 0) + item.quantity
        );
      }

      const returnedQtyByProduct = new Map<number, number>();
      for (const returned of previousReturns) {
        for (const item of returned.items) {
          returnedQtyByProduct.set(
            item.productId,
            (returnedQtyByProduct.get(item.productId) ?? 0) + item.quantity
          );
        }
      }

      const normalizedItems = data.items.map((item) => {
        const soldQty = soldQtyByProduct.get(item.productId) ?? 0;
        const alreadyReturned = returnedQtyByProduct.get(item.productId) ?? 0;
        const remainingQty = soldQty - alreadyReturned;

        if (remainingQty <= 0) {
          throw new Error(`No refundable quantity for ${item.name}`);
        }

        if (item.quantity > remainingQty) {
          throw new Error(
            `Return quantity exceeds remaining quantity for ${item.name}`
          );
        }

        const sourceItem = sale.items.find(
          (saleItem: any) => saleItem.productId === item.productId
        );

        if (!sourceItem) {
          throw new Error(`Product not found in sale: ${item.name}`);
        }

        return {
          productId: item.productId,
          sku: item.sku.trim(),
          name: item.name.trim(),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          refundTotal: item.refundTotal,
        };
      });

      const subtotal = normalizedItems.reduce(
        (sum: number, item: any) => sum + item.refundTotal,
        0
      );

      const refundAmount =
        data.refundAmount > 0 ? Math.min(data.refundAmount, subtotal) : subtotal;

      let currentShiftId: number | null = null;

      if (data.refundMethod === "cash") {
        const currentShift = await tx.cashShift.findFirst({
          where: { status: "open" },
          orderBy: { openedAt: "desc" },
        });

        if (!currentShift) {
          throw new Error("Open cash shift is required for cash refunds");
        }

        currentShiftId = currentShift.id;
      }

      const salesReturn = await tx.salesReturn.create({
        data: {
          returnNumber: data.returnNumber.trim(),
          returnDate: new Date(data.returnDate),
          saleId: sale.id,
          invoiceNumber: data.invoiceNumber.trim(),
          cashier: data.cashier.trim(),
          reason: data.reason.trim(),
          refundMethod: data.refundMethod as PaymentMethod,
          shiftId: currentShiftId,
          subtotal,
          refundAmount,
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.productId,
              sku: item.sku,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              refundTotal: item.refundTotal,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of normalizedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }

      if (data.refundMethod === "cash" && currentShiftId !== null) {
        await tx.cashMovement.create({
          data: {
            shiftId: currentShiftId,
            type: "OUT",
            amount: refundAmount,
            note: `Return ${data.returnNumber}`,
          },
        });
      }

      return salesReturn;
    });

    res.status(201).json({ salesReturn: serializeReturn(created) });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.startsWith("Sale not found") ||
        error.message.startsWith("No refundable quantity") ||
        error.message.startsWith("Return quantity exceeds") ||
        error.message.startsWith("Product not found in sale") ||
        error.message.startsWith("Open cash shift is required")
      ) {
        return res.status(400).json({ message: error.message });
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({ message: "Return number already exists" });
    }

    next(error);
  }
});