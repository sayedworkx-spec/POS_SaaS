import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const expensesRouter = Router();

const expenseSchema = z.object({
  expenseNumber: z.string().min(1),
  expenseDate: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.coerce.number().min(0),
  paymentMethod: z.enum(["cash", "card"]),
  shiftId: z.coerce.number().int().nullable().optional(),
  createdBy: z.string().min(1),
});

const updateExpenseSchema = expenseSchema.partial();

type ExpenseMeta = {
  expenseNumber: string;
  expenseDate: string;
  category: string;
  description: string;
  paymentMethod: "cash" | "card";
  shiftId: number | null;
  createdBy: string;
};

function canAccess(role?: string) {
  return role === "admin" || role === "cashier";
}

function parseExpenseMeta(note: unknown, fallbackId?: number): Partial<ExpenseMeta> {
  if (typeof note !== "string" || !note.trim()) {
    return fallbackId ? { expenseNumber: `EXP-${fallbackId}` } : {};
  }

  const trimmed = note.trim();

  try {
    const parsed = JSON.parse(trimmed) as Partial<ExpenseMeta>;
    return {
      expenseNumber: parsed.expenseNumber,
      expenseDate: parsed.expenseDate,
      category: parsed.category,
      description: parsed.description,
      paymentMethod: parsed.paymentMethod,
      shiftId: parsed.shiftId ?? null,
      createdBy: parsed.createdBy,
    };
  } catch {
    const parts = trimmed
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 3) {
      return {
        expenseNumber: parts[0],
        category: parts[1],
        createdBy: parts[2],
      };
    }

    const numberMatch = trimmed.match(/EXP[-\w\d]+/i);
    return {
      expenseNumber: numberMatch ? numberMatch[0] : fallbackId ? `EXP-${fallbackId}` : undefined,
      category: "General",
      description: trimmed,
      createdBy: "System",
    };
  }
}

function buildExpenseNote(meta: Partial<ExpenseMeta>) {
  return JSON.stringify({
    expenseNumber: meta.expenseNumber,
    expenseDate: meta.expenseDate,
    category: meta.category,
    description: meta.description,
    paymentMethod: meta.paymentMethod,
    shiftId: meta.shiftId ?? null,
    createdBy: meta.createdBy,
  });
}

function serializeExpense(expense: any) {
  const meta = parseExpenseMeta(expense.note, expense.id);

  return {
    id: Number(expense.id),
    expenseNumber: String(meta.expenseNumber ?? `EXP-${expense.id}`),
    expenseDate:
      meta.expenseDate ??
      (expense.createdAt instanceof Date
        ? expense.createdAt.toISOString()
        : String(expense.createdAt ?? new Date().toISOString())),
    category: String(meta.category ?? "General"),
    description: String(meta.description ?? expense.note ?? ""),
    amount: Number(expense.amount),
    paymentMethod: (meta.paymentMethod ?? "cash") as "cash" | "card",
    shiftId:
      meta.shiftId !== undefined
        ? meta.shiftId
        : expense.shiftId !== null && expense.shiftId !== undefined
          ? Number(expense.shiftId)
          : null,
    createdBy: String(meta.createdBy ?? "System"),
    createdAt:
      expense.createdAt instanceof Date
        ? expense.createdAt.toISOString()
        : String(expense.createdAt ?? new Date().toISOString()),
    updatedAt:
      expense.updatedAt instanceof Date
        ? expense.updatedAt.toISOString()
        : String(expense.updatedAt ?? new Date().toISOString()),
  };
}

async function readExpenseMovements() {
  const db = prisma as any;

  const movements = await db.cashMovement.findMany({
    where: { type: "OUT" },
    orderBy: { createdAt: "desc" },
  });

  return movements.map((movement: any) => ({
    ...movement,
    ...parseExpenseMeta(movement.note, movement.id),
  }));
}

function canUseCashShift(role?: string) {
  return role === "admin" || role === "cashier";
}

expensesRouter.use(requireAuth);

expensesRouter.get("/", async (req: AuthRequest, res, next) => {
  try {
    if (!canAccess(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const expenses = await readExpenseMovements();
    res.json({ expenses: expenses.map((item: any) => serializeExpense(item)) });
  } catch (error) {
    next(error);
  }
});

expensesRouter.get("/:expenseNumber", async (req: AuthRequest, res, next) => {
  try {
    if (!canAccess(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const expenses = await readExpenseMovements();
    const expense = expenses.find(
      (item: any) => String(item.expenseNumber) === String(req.params.expenseNumber)
    );

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

    const data = expenseSchema.parse(req.body);
    const db = prisma as any;

    const existingExpenses = await readExpenseMovements();
    const duplicate = existingExpenses.find(
      (item: any) => String(item.expenseNumber) === String(data.expenseNumber)
    );

    if (duplicate) {
      return res.status(409).json({ message: "Expense number already exists" });
    }

    let shiftId: number | null = null;

    if (data.paymentMethod === "cash") {
      if (data.shiftId !== undefined && data.shiftId !== null) {
        shiftId = Number(data.shiftId);
      } else if (canUseCashShift(req.user?.role)) {
        const openShift = await db.cashShift.findFirst({
          where: { status: "open" },
          orderBy: { openedAt: "desc" },
        });

        if (!openShift) {
          return res.status(400).json({ message: "Open cash shift is required for cash expenses" });
        }

        shiftId = Number(openShift.id);
      } else {
        return res.status(400).json({ message: "Open cash shift is required for cash expenses" });
      }
    }

    const created = await db.cashMovement.create({
      data: {
        shiftId,
        type: "OUT",
        amount: data.amount,
        note: buildExpenseNote({
          expenseNumber: data.expenseNumber.trim(),
          expenseDate: data.expenseDate,
          category: data.category.trim(),
          description: data.description.trim(),
          paymentMethod: data.paymentMethod,
          shiftId,
          createdBy: data.createdBy.trim(),
        }),
      },
    });

    res.status(201).json({ expense: serializeExpense(created) });
  } catch (error) {
    next(error);
  }
});

expensesRouter.put("/:expenseNumber", async (req: AuthRequest, res, next) => {
  try {
    if (!canAccess(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const data = updateExpenseSchema.parse(req.body);
    const db = prisma as any;

    const movements = await readExpenseMovements();
    const target = movements.find(
      (item: any) => String(item.expenseNumber) === String(req.params.expenseNumber)
    );

    if (!target) {
      return res.status(404).json({ message: "Expense not found" });
    }

    let shiftId: number | null =
      data.shiftId !== undefined ? data.shiftId : target.shiftId ?? null;

    if (data.paymentMethod === "cash" || target.paymentMethod === "cash") {
      if (shiftId === null) {
        if (canUseCashShift(req.user?.role)) {
          const openShift = await db.cashShift.findFirst({
            where: { status: "open" },
            orderBy: { openedAt: "desc" },
          });

          if (!openShift) {
            return res.status(400).json({ message: "Open cash shift is required for cash expenses" });
          }

          shiftId = Number(openShift.id);
        } else {
          return res.status(400).json({ message: "Open cash shift is required for cash expenses" });
        }
      }
    }

    const updated = await db.cashMovement.update({
      where: { id: Number(target.id) },
      data: {
        amount: data.amount ?? target.amount,
        shiftId,
        note: buildExpenseNote({
          expenseNumber: data.expenseNumber ?? target.expenseNumber,
          expenseDate: data.expenseDate ?? target.expenseDate,
          category: data.category ?? target.category,
          description: data.description ?? target.description,
          paymentMethod: (data.paymentMethod ?? target.paymentMethod) as "cash" | "card",
          shiftId,
          createdBy: data.createdBy ?? target.createdBy,
        }),
      },
    });

    res.json({ expense: serializeExpense(updated) });
  } catch (error) {
    next(error);
  }
});

expensesRouter.delete("/:expenseNumber", async (req: AuthRequest, res, next) => {
  try {
    if (!canAccess(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const db = prisma as any;
    const movements = await readExpenseMovements();

    const target = movements.find(
      (item: any) => String(item.expenseNumber) === String(req.params.expenseNumber)
    );

    if (!target) {
      return res.status(404).json({ message: "Expense not found" });
    }

    await db.cashMovement.delete({
      where: { id: Number(target.id) },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});