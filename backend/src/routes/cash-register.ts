import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const cashRegisterRouter = Router();

const openShiftSchema = z.object({
  openingCash: z.coerce.number().min(0),
});

const movementSchema = z.object({
  shiftId: z.coerce.number().int().optional(),
  type: z.enum(["IN", "OUT"]),
  amount: z.coerce.number().min(0),
  note: z.string().min(1),
});

const closeShiftSchema = z.object({
  actualCash: z.coerce.number().min(0),
});

function canAccess(role?: string) {
  return role === "admin" || role === "cashier";
}

function serializeShift(shift: any) {
  return {
    id: Number(shift.id),
    userId: shift.userId !== null ? Number(shift.userId) : null,
    userName: String(shift.userName),
    openingCash: Number(shift.openingCash),
    closingCash: shift.closingCash !== null ? Number(shift.closingCash) : null,
    actualCash: shift.actualCash !== null ? Number(shift.actualCash) : null,
    difference: shift.difference !== null ? Number(shift.difference) : null,
    status: String(shift.status),
    openedAt:
      shift.openedAt instanceof Date
        ? shift.openedAt.toISOString()
        : String(shift.openedAt),
    closedAt:
      shift.closedAt instanceof Date
        ? shift.closedAt.toISOString()
        : shift.closedAt
          ? String(shift.closedAt)
          : null,
  };
}

function serializeMovement(movement: any) {
  return {
    id: Number(movement.id),
    shiftId: movement.shiftId !== null ? Number(movement.shiftId) : null,
    type: movement.type as "IN" | "OUT",
    amount: Number(movement.amount),
    note: String(movement.note),
    createdAt:
      movement.createdAt instanceof Date
        ? movement.createdAt.toISOString()
        : String(movement.createdAt),
  };
}

async function getShiftSummaryRecord(shiftId: number) {
  const shift = await prisma.cashShift.findUnique({
    where: { id: shiftId },
  });

  if (!shift) {
    return null;
  }

  const movements = await prisma.cashMovement.findMany({
    where: { shiftId },
    orderBy: { createdAt: "desc" },
  });

  const cashIn = movements
    .filter((movement) => movement.type === "IN")
    .reduce((sum, movement) => sum + Number(movement.amount), 0);

  const cashOut = movements
    .filter((movement) => movement.type === "OUT")
    .reduce((sum, movement) => sum + Number(movement.amount), 0);

  const expectedCash = Number(shift.openingCash) + cashIn - cashOut;
  const actualCash =
    shift.actualCash !== null ? Number(shift.actualCash) : expectedCash;
  const difference =
    shift.difference !== null ? Number(shift.difference) : actualCash - expectedCash;

  return {
    shift: serializeShift(shift),
    openingCash: Number(shift.openingCash),
    cashIn,
    cashOut,
    expectedCash,
    actualCash,
    difference,
    movements: movements.map(serializeMovement),
  };
}

async function getCurrentOpenShift() {
  return prisma.cashShift.findFirst({
    where: { status: "open" },
    orderBy: { openedAt: "desc" },
  });
}

cashRegisterRouter.use(requireAuth);

cashRegisterRouter.get("/current", async (req: AuthRequest, res, next) => {
  try {
    if (!canAccess(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const shift = await getCurrentOpenShift();

    if (!shift) {
      return res.json({ shift: null });
    }

    res.json({ shift: serializeShift(shift) });
  } catch (error) {
    next(error);
  }
});

cashRegisterRouter.get("/shifts", async (req: AuthRequest, res, next) => {
  try {
    if (!canAccess(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const shifts = await prisma.cashShift.findMany({
      orderBy: { openedAt: "desc" },
    });

    res.json({ shifts: shifts.map(serializeShift) });
  } catch (error) {
    next(error);
  }
});

cashRegisterRouter.get("/summary", async (req: AuthRequest, res, next) => {
  try {
    if (!canAccess(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const shiftId = req.query.shiftId ? Number(req.query.shiftId) : null;
    const currentShift = shiftId ? await prisma.cashShift.findUnique({ where: { id: shiftId } }) : await getCurrentOpenShift();

    if (!currentShift) {
      return res.json({ summary: null });
    }

    const summary = await getShiftSummaryRecord(currentShift.id);
    return res.json({ summary });
  } catch (error) {
    next(error);
  }
});

cashRegisterRouter.post("/open", async (req: AuthRequest, res, next) => {
  try {
    if (!canAccess(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const data = openShiftSchema.parse(req.body);

    const existingOpen = await getCurrentOpenShift();
    if (existingOpen) {
      return res.status(409).json({ message: "A cash shift is already open" });
    }

    const shift = await prisma.cashShift.create({
      data: {
        userId: req.user?.id ?? null,
        userName: req.user?.name ?? "Cashier",
        openingCash: data.openingCash,
        status: "open",
      },
    });

    const summary = await getShiftSummaryRecord(shift.id);

    res.status(201).json({
      shift: serializeShift(shift),
      summary,
    });
  } catch (error) {
    next(error);
  }
});

cashRegisterRouter.post("/movements", async (req: AuthRequest, res, next) => {
  try {
    if (!canAccess(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const data = movementSchema.parse(req.body);

    const shift =
      data.shiftId !== undefined
        ? await prisma.cashShift.findUnique({ where: { id: data.shiftId } })
        : await getCurrentOpenShift();

    if (!shift) {
      return res.status(404).json({ message: "Cash shift not found" });
    }

    if (shift.status !== "open") {
      return res.status(400).json({ message: "Cash shift is closed" });
    }

    const movement = await prisma.cashMovement.create({
      data: {
        shiftId: shift.id,
        type: data.type,
        amount: data.amount,
        note: data.note.trim(),
      },
    });

    const summary = await getShiftSummaryRecord(shift.id);

    res.status(201).json({
      movement: serializeMovement(movement),
      summary,
    });
  } catch (error) {
    next(error);
  }
});

cashRegisterRouter.post("/:id/close", async (req: AuthRequest, res, next) => {
  try {
    if (!canAccess(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const id = Number(req.params.id);
    const { actualCash } = closeShiftSchema.parse(req.body);

    const shift = await prisma.cashShift.findUnique({
      where: { id },
    });

    if (!shift) {
      return res.status(404).json({ message: "Cash shift not found" });
    }

    if (shift.status !== "open") {
      return res.status(400).json({ message: "Cash shift is already closed" });
    }

    const movements = await prisma.cashMovement.findMany({
      where: { shiftId: id },
    });

    const cashIn = movements
      .filter((movement) => movement.type === "IN")
      .reduce((sum, movement) => sum + Number(movement.amount), 0);

    const cashOut = movements
      .filter((movement) => movement.type === "OUT")
      .reduce((sum, movement) => sum + Number(movement.amount), 0);

    const expectedCash = Number(shift.openingCash) + cashIn - cashOut;
    const difference = actualCash - expectedCash;

    const closed = await prisma.cashShift.update({
      where: { id },
      data: {
        status: "closed",
        closingCash: expectedCash,
        actualCash,
        difference,
        closedAt: new Date(),
      },
    });

    res.json({
      shift: serializeShift(closed),
      summary: await getShiftSummaryRecord(closed.id),
    });
  } catch (error) {
    next(error);
  }
});