import type { AuditLog } from "../types/AuditLog";

const AUDIT_LOGS_KEY = "audit_logs";
const CURRENT_USER_KEY = "currentUser";

function readCurrentUserName() {
  const raw = localStorage.getItem(CURRENT_USER_KEY);

  if (!raw) {
    return "System";
  }

  try {
    const parsed = JSON.parse(raw) as { name?: unknown };
    return String(parsed.name ?? "System") || "System";
  } catch {
    return "System";
  }
}

function readLogs(): AuditLog[] {
  const raw = localStorage.getItem(AUDIT_LOGS_KEY);

  if (!raw) {
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify([]));
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify([]));
      return [];
    }

    const normalized: AuditLog[] = parsed.map((item) => {
      const log = item as Partial<AuditLog>;
      return {
        id: Number(log.id ?? Date.now()),
        action: String(log.action ?? "").trim() || "UNKNOWN",
        username: String(log.username ?? "System"),
        details: String(log.details ?? ""),
        createdAt: String(log.createdAt ?? new Date().toISOString()),
      };
    });

    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify([]));
    return [];
  }
}

function writeLogs(logs: AuditLog[]) {
  localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
}

export function getAuditLogs(): AuditLog[] {
  return readLogs();
}

export function addAuditLog(action: string, details: string, username?: string) {
  const logs = readLogs();

  const newLog: AuditLog = {
    id: Date.now(),
    action: action.trim() || "UNKNOWN",
    username: username?.trim() || readCurrentUserName(),
    details: details.trim(),
    createdAt: new Date().toISOString(),
  };

  logs.unshift(newLog);
  writeLogs(logs);

  return newLog;
}

export function clearAuditLogs() {
  localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify([]));
}