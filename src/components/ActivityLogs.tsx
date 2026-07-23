import React, { useState } from "react";
import { LogEntry } from "../types";
import { History, Shield, Trash2, Search, Calendar } from "lucide-react";

interface ActivityLogsProps {
  logs: LogEntry[];
}

export const ActivityLogs: React.FC<ActivityLogsProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.admin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatLogDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm transition-all duration-300" id="activity-logs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-500" />
            Riwayat Log Aktivitas Admin
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Audit transparan pelacakan perubahan jadwal dan konfigurasi sistem bel oleh admin.
          </p>
        </div>

        {/* Filter search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Cari log aktivitas..."
            className="w-full pl-4 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-zinc-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredLogs.length > 0 ? (
        <div className="overflow-hidden border border-zinc-100 dark:border-zinc-800 rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-4 py-3 font-semibold">Waktu Kejadian</th>
                  <th className="px-4 py-3 font-semibold">Pengguna</th>
                  <th className="px-4 py-3 font-semibold">Tindakan</th>
                  <th className="px-4 py-3 font-semibold">Rincian Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    id={`log-row-${log.id}`}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20 text-zinc-600 dark:text-zinc-350 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-zinc-400 whitespace-nowrap">
                      {formatLogDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] tracking-wide ${
                        log.admin === "Admin"
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                      }`}>
                        {log.admin}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-850 dark:text-zinc-100 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="px-4 py-3 max-w-xs sm:max-w-md truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-zinc-50/50 dark:bg-zinc-800/10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <History className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Tidak ada log aktivitas ditemukan.
          </p>
        </div>
      )}
    </div>
  );
};
