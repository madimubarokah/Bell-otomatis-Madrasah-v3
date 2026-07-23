import React, { useState } from "react";
import { ScheduleItem } from "../types";
import { Clock, Edit2, Trash2, Calendar, Shield, Search, ToggleLeft, ToggleRight } from "lucide-react";

interface ScheduleListProps {
  schedules: ScheduleItem[];
  isAdmin: boolean;
  onEdit: (item: ScheduleItem) => void;
  onDelete: (id: string) => void;
  onToggleActive: (item: ScheduleItem) => void;
}

export const ScheduleList: React.FC<ScheduleListProps> = ({
  schedules,
  isAdmin,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay()); // default to today
  const [searchQuery, setSearchQuery] = useState("");

  const daysOfWeek = [
    { value: 1, label: "Senin", name: "Itsnain" },
    { value: 2, label: "Selasa", name: "Tsulatsa" },
    { value: 3, label: "Rabu", name: "Arbi'a" },
    { value: 4, label: "Kamis", name: "Khomis" },
    { value: 5, label: "Jumat", name: "Jumu'ah" },
    { value: 6, label: "Sabtu", name: "Sabt" },
    { value: 0, label: "Minggu", name: "Ahad" },
  ];

  const filteredSchedules = schedules
    .filter((item) => item.days.includes(selectedDay))
    .filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const [aH, aM] = a.time.split(":").map(Number);
      const [bH, bM] = b.time.split(":").map(Number);
      return aH * 60 + aM - (bH * 60 + bM);
    });

  // Helper to render period types
  const getBadgeColor = (type: string) => {
    switch (type) {
      case "class":
        return "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30";
      case "break":
        return "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30";
      default:
        return "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border-sky-100 dark:border-sky-900/30";
    }
  };

  const getDayNameInIndo = (num: number) => {
    const list = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return list[num];
  };

  return (
    <div id="schedule-list" className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm transition-all duration-300">
      {/* Search and Day Tabs */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            Jadwal Harian Madrasah
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Pilih hari untuk melihat susunan jadwal bel otomatis yang aktif.
          </p>
        </div>

        {/* Search input with clean styled icons */}
        <div className="relative w-full xl:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-zinc-400" />
          </span>
          <input
            type="text"
            placeholder="Cari jadwal pelajaran..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-zinc-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-6">
        {daysOfWeek.map((day) => (
          <button
            key={day.value}
            id={`tab-day-${day.value}`}
            onClick={() => setSelectedDay(day.value)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              selectedDay === day.value
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                : "bg-zinc-50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800"
            }`}
          >
            {day.label} <span className={`text-[10px] font-normal block ${selectedDay === day.value ? "text-emerald-100" : "text-zinc-400 dark:text-zinc-500"}`}>{day.name}</span>
          </button>
        ))}
      </div>

      {/* Schedule Items Table/Card Stack */}
      {filteredSchedules.length > 0 ? (
        <div className="space-y-3">
          {filteredSchedules.map((item) => (
            <div
              key={item.id}
              id={`schedule-item-${item.id}`}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all ${
                item.active
                  ? "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700"
                  : "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-100/50 dark:border-zinc-850 opacity-60"
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Time badge */}
                <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  {item.time}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                      {item.name}
                    </p>
                    {item.period && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-50 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-md border border-zinc-150 dark:border-zinc-700">
                        Ke-{item.period}
                      </span>
                    )}
                  </div>
                  {item.customText ? (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 italic truncate max-w-[280px] sm:max-w-md mt-0.5">
                      "{item.customText}"
                    </p>
                  ) : (
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Tipe: {item.type === "class" ? "Pelajaran" : item.type === "break" ? "Istirahat" : "Kustom"} • Hari: {item.days.map(d => getDayNameInIndo(d)).join(", ")}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-zinc-50 dark:border-zinc-850">
                {/* Class Type tag */}
                <span className={`px-2.5 py-1 text-[11px] font-semibold border rounded-lg uppercase tracking-wider ${getBadgeColor(item.type)}`}>
                  {item.type === "class" ? "Kelas" : item.type === "break" ? "Istirahat" : "Kustom"}
                </span>

                {isAdmin ? (
                  <div className="flex items-center gap-1">
                    {/* Quick active toggle */}
                    <button
                      onClick={() => onToggleActive(item)}
                      title={item.active ? "Nonaktifkan bel" : "Aktifkan bel"}
                      className="p-1.5 text-zinc-400 hover:text-emerald-500 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      {item.active ? (
                        <ToggleRight className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => onEdit(item)}
                      title="Edit jadwal"
                      className="p-2 text-zinc-400 hover:text-blue-500 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDelete(item.id)}
                      title="Hapus jadwal"
                      className="p-2 text-zinc-400 hover:text-red-500 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-zinc-400 italic flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800/40 px-2 py-1 rounded-md border border-zinc-100 dark:border-zinc-800">
                    <Shield className="w-3 h-3 text-zinc-300" /> Guest Mode
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-zinc-50/50 dark:bg-zinc-800/20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Calendar className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Tidak ada jadwal bel aktif hari ini.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            Gunakan filter pencarian di atas atau tambah jadwal baru sebagai Admin.
          </p>
        </div>
      )}
    </div>
  );
};
