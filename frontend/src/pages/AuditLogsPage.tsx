import { useMemo, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { clearAuditLogs, getAuditLogs } from "../services/auditService";

import type { AuditLog } from "../types/AuditLog";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AuditLogsPage() {
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState("");

  const logs = useMemo(() => {
    return getAuditLogs();
  }, [version]);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return logs;
    }

    return logs.filter((log) => {
      return (
        log.action.toLowerCase().includes(term) ||
        log.username.toLowerCase().includes(term) ||
        log.details.toLowerCase().includes(term)
      );
    });
  }, [logs, search]);

  function refresh() {
    setVersion((current) => current + 1);
  }

  function handleClear() {
    const ok = window.confirm("Clear all audit logs?");
    if (!ok) return;

    clearAuditLogs();
    refresh();
  }

  return (
    <MainLayout>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track important actions in the system
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-xl bg-white px-4 py-3 shadow">
            <div className="text-xs text-slate-500">Records</div>
            <div className="text-2xl font-bold mt-1">{filteredLogs.length}</div>
          </div>

          <button
            onClick={handleClear}
            className="rounded-xl bg-red-600 px-4 py-3 font-medium text-white"
          >
            Clear Logs
          </button>
        </div>
      </div>

      <div className="mb-6 w-full max-w-xl">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by user, action, or details..."
          className="w-full rounded-xl border bg-white p-3 shadow"
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow">
        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-4 text-left">User</th>
                <th className="p-4 text-left">Action</th>
                <th className="p-4 text-left">Details</th>
                <th className="p-4 text-left">Date</th>
              </tr>
            </thead>

            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td className="p-6 text-slate-500" colSpan={4}>
                    No audit logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: AuditLog) => (
                  <tr key={log.id} className="border-t">
                    <td className="p-4">{log.username}</td>
                    <td className="p-4 font-medium">{log.action}</td>
                    <td className="p-4">{log.details}</td>
                    <td className="p-4 text-sm text-slate-500">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}