import { PaymentMethod } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const expensesRouter = Router();

const createExpenseSchema = z.object({
  expenseNumber: z.string().min(1),
  expenseDate: z.string().datetime(),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.coerce.number().min(0),
  paymentMethod: z.enum(["cash", "card"]),
  shiftId: z.coerce.number().int().nullable().optional(),
  createdBy: z.string().min(1),
});

function canAccess(role?: string) {
  return role === "admin" || role === "cashier";
}

function serializeExpense(expense: any) {
  return {
    id: Number(expense.id),
    expenseNumber: String(expense.expenseNumber),
    expenseDate:
      expense.expenseDate instanceof Date
        ? expense.expenseDate.toISOString()
        : String(expense.expenseDate),
    category: String(expense.category),
    description: String(expense.description),
    amount: Number(expense.amount),
    paymentMethod: expense.paymentMethod as "cash" | "card",
    shiftId: expense.shiftId !== null ? Number(expense.shiftId) : null,
    createdBy: String(expense.createdBy),
    createdAt:
      expense.createdAt instanceof Date
        ? expense.createdAt.toISOString()
        : String(expense.createdAt),
    updatedAt:
      expense.updatedAt instanceof Date
        ? expense.updatedAt.toISOString()
        : String(expense.updatedAt),
  };
}

expensesRouter.use(requireAuth);

expensesRouter.get("/", async (req: AuthRequest, res, next) => {
  try {
    if (!canAccess(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const db = prisma as any;

    const expenses = await db.expense.findMany({
      orderBy: { expenseDate: "desc" },
    });

    res.json({ expenses: expenses.map(serializeExpense) });
  } catch (error) {
    next(error);
  }
});

expensesRouter.get("/:expenseNumber", async (req: AuthRequest, res, next) => {
  try {
    if (!canAccess(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const db = prisma as any;

    const expense = await db.expense.findUnique({
      where: { expenseNumber: req.params.expenseNumber },
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json({ expense: serializeExpense(expense) });
  } catch (error) {
    next(error);
  }
});

expensesRouter.post("/", async (req: AuthRequest, res, next) => {
  try {
    if (!canAccess(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const data = createExpenseSchema.parse(req.body);
    const db = prisma as any;

    const existing = await db.expense.findUnique({
      where: { expenseNumber: data.expenseNumber },
      select: { id: true },
    });

    if (existing) {
      return res.status(409).json({ message: "Expense number already exists" });
    }

    let currentShiftId: number | null = null;

    if (data.paymentMethod === "cash") {
      const shift =
        data.shiftId !== undefined && data.shiftId !== null
          ? await db.cashShift.findUnique({ where: { id: data.shiftId } })
          : await db.cashShift.findFirst({
              where: { status: "open" },
              orderBy: { openedAt: "desc" },
            });

      if (!shift) {
        return res
          .status(400)
          .json({ message: "Open cash shift is required for cash expenses" });
      }

      if (shift.status !== "open") {
        return res.status(400).json({ message: "Cash shift is closed" });
      }

      currentShiftId = shift.id;
    }

    const expense = await db.$transaction(async (tx: any) => {
      const createdExpense = await tx.expense.create({
        data: {
          expenseNumber: data.expenseNumber.trim(),
          expenseDate: new Date(data.expenseDate),
          category: data.category.trim(),
          description: data.description.trim(),
          amount: data.amount,
          paymentMethod: data.paymentMethod as PaymentMethod,
          shiftId: currentShiftId,
          createdBy: data.createdBy.trim(),
        },
      });

      if (data.paymentMethod === "cash" && currentShiftId !== null) {
        await tx.cashMovement.create({
          data: {
            shiftId: currentShiftId,
            type: "OUT",
            amount: data.amount,
            note: `Expense ${data.expenseNumber}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: "EXPENSE_CREATED",
          username: data.createdBy.trim(),
          details: `${data.expenseNumber} | ${data.category} | ${data.amount}`,
        },
      });

      return createdExpense;
    });

    res.status(201).json({ expense: serializeExpense(expense) });
  } catch (error) {
    next(error);
  }
});