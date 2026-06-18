import { apiFetch, getStoredToken, readApiError } from "./api";
import type { AuditLog } from "../types/AuditLog";

const AUDIT_LOGS_KEY = "audit_logs";

function normalizeAuditLog(raw: any): AuditLog {
  return {
    id: Number(raw?.id ?? Date.now()),
    action: String(raw?.action ?? "").trim() || "UNKNOWN",
    username: String(raw?.username ?? "System").trim() || "System",
    details: String(raw?.details ?? "").trim(),
    createdAt:
      typeof raw?.createdAt === "string"
        ? raw.createdAt
        : new Date(raw?.createdAt ?? Date.now()).toISOString(),
  };
}

function readLocalLogs(): AuditLog[] {
  const raw = localStorage.getItem(AUDIT_LOGS_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeAuditLog(item));
  } catch {
    return [];
  }
}

function writeLocalLogs(logs: AuditLog[]) {
  localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
}

function upsertLocalLog(log: AuditLog) {
  const current = readLocalLogs();
  const index = current.findIndex((item) => item.id === log.id);

  if (index === -1) {
    current.unshift(log);
  } else {
    current[index] = log;
  }

  writeLocalLogs(current);
}

function mergeLogs(serverLogs: AuditLog[], localLogs: AuditLog[]) {
  const map = new Map<number, AuditLog>();

  for (const log of localLogs) {
    map.set(log.id, log);
  }

  for (const log of serverLogs) {
    map.set(log.id, log);
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function getFallbackUsername() {
  try {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return "System";

    const parsed = JSON.parse(raw) as { name?: unknown };
    return String(parsed.name ?? "System").trim() || "System";
  } catch {
    return "System";
  }
}

export function getAuditLogs(): AuditLog[] {
  return readLocalLogs();
}

export async function syncAuditLogsCache() {
  const localLogs = readLocalLogs();

  if (!getStoredToken()) {
    return localLogs;
  }

  const response = await apiFetch("/audit-logs");

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { auditLogs?: unknown };

  const serverLogs = Array.isArray(payload.auditLogs)
    ? payload.auditLogs.map((item) => normalizeAuditLog(item))
    : [];

  const merged = mergeLogs(serverLogs, localLogs);
  writeLocalLogs(merged);

  return merged;
}

export async function addAuditLog(
  action: string,
  details: string,
  username?: string
) {
  const payload = {
    action: action.trim(),
    details: details.trim(),
    username: (username ?? getFallbackUsername()).trim() || "System",
  };

  const optimistic: AuditLog = {
    id: Date.now(),
    action: payload.action || "UNKNOWN",
    username: payload.username,
    details: payload.details,
    createdAt: new Date().toISOString(),
  };

  try {
    if (!getStoredToken()) {
      upsertLocalLog(optimistic);
      return optimistic;
    }

    const response = await apiFetch("/audit-logs", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await readApiError(response));
    }

    const data = (await response.json()) as { auditLog?: unknown };
    const saved = normalizeAuditLog(data.auditLog ?? optimistic);

    upsertLocalLog(saved);
    return saved;
  } catch {
    upsertLocalLog(optimistic);
    return optimistic;
  }
}

export async function clearAuditLogs() {
  if (!getStoredToken()) {
    writeLocalLogs([]);
    return;
  }

  const response = await apiFetch("/audit-logs/clear", {
    method: "DELETE",
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(await readApiError(response));
  }

  writeLocalLogs([]);
}