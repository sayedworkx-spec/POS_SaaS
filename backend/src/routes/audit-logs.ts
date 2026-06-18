import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const auditLogsRouter = Router();

const createAuditLogSchema = z.object({
  action: z.string().min(1),
  details: z.string().min(1),
  username: z.string().optional(),
});

function canRead(role?: string) {
  return role === "admin";
}

function serializeAuditLog(log: any) {
  return {
    id: Number(log.id),
    action: String(log.action),
    username: String(log.username),
    details: String(log.details),
    createdAt:
      log.createdAt instanceof Date
        ? log.createdAt.toISOString()
        : String(log.createdAt),
  };
}

auditLogsRouter.use(requireAuth);

auditLogsRouter.get("/", async (req: AuthRequest, res, next) => {
  try {
    if (!canRead(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json({ auditLogs: auditLogs.map(serializeAuditLog) });
  } catch (error) {
    next(error);
  }
});

auditLogsRouter.post("/", async (req: AuthRequest, res, next) => {
  try {
    const data = createAuditLogSchema.parse(req.body);

    const auditLog = await prisma.auditLog.create({
      data: {
        action: data.action.trim(),
        username: (req.user?.name ?? data.username ?? "System").trim(),
        details: data.details.trim(),
      },
    });

    res.status(201).json({ auditLog: serializeAuditLog(auditLog) });
  } catch (error) {
    next(error);
  }
});

auditLogsRouter.delete("/clear", async (req: AuthRequest, res, next) => {
  try {
    if (!canRead(req.user?.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await prisma.auditLog.deleteMany();

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});