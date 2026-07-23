import React, { useState, useEffect } from "react";
import { ScheduleItem } from "../types";
import { Plus, Check, Copy, Calendar, RotateCcw } from "lucide-react";

interface AdminScheduleFormProps {
  editItem: ScheduleItem | null;
  onSave: (item: Omit<ScheduleItem, "id"> & { id?: string }) => void;
  onCancelEdit: () => void;
  onDuplicate: (sourceDay: number, targetDays: number[]) => void;
}

export const AdminScheduleForm: React.FC<AdminScheduleFormProps> = ({
  editItem,
  onSave,
  onCancelEdit,
  onDuplicate,
}) => {
  // 1. Form state
  const [name, setName] = useState("");
  const [time, setTime] = useState("07:00");
  const [type, setType] = useState<"class" | "break" | "custom">("class");
  const [period, setPeriod] = useState<number | undefined>(1);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4]); // defaults to Monday-Thursday
  const [customText, setCustomText] = useState("");

  // 2. Duplication state
  const [sourceDay, setSourceDay] = useState<number>(1);
  const [targetDays, setTargetDays] = useState<number[]>([]);

  // Update form values if we are editing an item
  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setTime(editItem.time);
      setType(editItem.type);
      setPeriod(editItem.period);
      setDays(editItem.days);
      setCustomText(editItem.customText || "");
    } else {
      resetForm();
    }
  }, [editItem]);

  const resetForm = () => {
    setName("");
    setTime("07:00");
    setType("class");
    setPeriod(1);
    setDays([1, 2, 3, 4]);
    setCustomText("");
  };

  const handleDayToggle = (dayVal: number) => {
    if (days.includes(dayVal)) {
      setDays(days.filter((d) => d !== dayVal));
    } else {
      setDays([...days, dayVal]);
    }
  };

  const handleQuickDaySelection = (preset: "weekday" | "workday" | "all" | "clear") => {
    if (preset === "weekday") {
      setDays([1, 2, 3, 4]); // Senin - Kamis (Common short week)
    } else if (preset === "workday") {
      setDays([1, 2, 3, 4, 5, 6]); // Senin - Sabtu (Full school week in Madrasah)
    } else if (preset === "all") {
      setDays([0, 1, 2, 3, 4, 5, 6]);
    } else {
      setDays([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !time || days.length === 0) {
      alert("Harap lengkapi nama jadwal, waktu, dan hari aktif.");
      return;
    }

    onSave({
      id: editItem?.id,
      name,
      time,
      type,
      period: type === "class" ? period : undefined,
      days,
      active: editItem ? editItem.active : true,
      customText: customText.trim() ? customText.trim() : undefined,
    });

    resetForm();
    if (editItem) onCancelEdit();
  };

  const handleDuplicateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetDays.length === 0) {
      alert("Pilih minimal satu hari tujuan duplikasi.");
      return;
    }
    onDuplicate(sourceDay, targetDays);
    setTargetDays([]);
  };

  const handleTargetDayToggle = (dayVal: number) => {
    if (targetDays.includes(dayVal)) {
      setTargetDays(targetDays.filter((d) => d !== dayVal));
    } else {
      setTargetDays([...targetDays, dayVal]);
    }
  };

  const daysList = [
    { value: 1, label: "Senin" },
    { value: 2, label: "Selasa" },
    { value: 3, label: "Rabu" },
    { value: 4, label: "Kamis" },
    { value: 5, label: "Jumat" },
    { value: 6, label: "Sabtu" },
    { value: 0, label: "Minggu" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ADD/EDIT FORM - Takes 2 cols */}
      <div id="schedule-form" className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm transition-all duration-300">
        <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-emerald-500" />
          {editItem ? "Edit Jadwal Bel" : "Tambah Jadwal Bel Madrasah"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Bel */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                Nama Jadwal / Label
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Pelajaran Ke-1, Istirahat, Pulang"
                className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-zinc-200"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Waktu (HH:MM) */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                Waktu Berbunyi (Jam:Menit)
              </label>
              <input
                type="time"
                required
                className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-zinc-200 font-mono"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tipe Bel */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                Tipe Kegiatan
              </label>
              <select
                className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-zinc-200"
                value={type}
                onChange={(e) => {
                  const newType = e.target.value as any;
                  setType(newType);
                  if (newType !== "class") setPeriod(undefined);
                  else if (!period) setPeriod(1);
                }}
              >
                <option value="class">Jam Pelajaran</option>
                <option value="break">Istirahat</option>
                <option value="custom">Kustom / Lain-lain</option>
              </select>
            </div>

            {/* Jam Pelajaran Ke- (Hanya aktif jika tipe = class) */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                Pelajaran Ke- <span className="text-[10px] text-zinc-400 lowercase font-normal">(opsional)</span>
              </label>
              <input
                type="number"
                min="1"
                max="12"
                disabled={type !== "class"}
                className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-zinc-200 disabled:opacity-50"
                value={period || ""}
                onChange={(e) => setPeriod(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Contoh: 1, 2, 3"
              />
            </div>
          </div>

          {/* Hari Aktif Checkbox */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Hari Aktif
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDaySelection("weekday")}
                  className="text-[10px] font-semibold text-emerald-600 hover:underline"
                >
                  Senin-Kamis
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDaySelection("workday")}
                  className="text-[10px] font-semibold text-emerald-600 hover:underline"
                >
                  Senin-Sabtu
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDaySelection("clear")}
                  className="text-[10px] font-semibold text-red-500 hover:underline"
                >
                  Hapus
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {daysList.map((day) => {
                const isActive = days.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 font-semibold"
                        : "bg-white dark:bg-zinc-900 border-zinc-150 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Voice Over Text */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
              Teks Pengumuman Suara Kustom <span className="text-[10px] text-zinc-400 lowercase font-normal">(opsional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Jika dikosongkan, suara robot akan diucapkan otomatis (contoh: 'Ahlan wa sahlan. Pelajaran ke-1 dimulai sekarang. Syukron.'). Tulis teks di sini jika ingin mengubah ucapannya."
              className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-zinc-200"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            {editItem && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/10 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {editItem ? "Simpan Perubahan" : "Simpan Jadwal"}
            </button>
          </div>
        </form>
      </div>

      {/* DUPLICATION UTILITY - Takes 1 col */}
      <div id="duplication-form" className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm transition-all duration-300 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 mb-2">
            <Copy className="w-5 h-5 text-emerald-500" />
            Duplikasi Jadwal Harian
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            Salin/Duplikat seluruh jadwal pada hari tertentu ke hari lainnya (misal: salin jadwal Senin ke Selasa, Rabu, Kamis) secara instan.
          </p>

          <form onSubmit={handleDuplicateSubmit} className="space-y-4">
            {/* Source Day */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                Hari Sumber (Asal)
              </label>
              <select
                className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-zinc-200"
                value={sourceDay}
                onChange={(e) => setSourceDay(Number(e.target.value))}
              >
                <option value={1}>Senin</option>
                <option value={2}>Selasa</option>
                <option value={3}>Rabu</option>
                <option value={4}>Kamis</option>
                <option value={5}>Jumat</option>
                <option value={6}>Sabtu</option>
                <option value={0}>Minggu</option>
              </select>
            </div>

            {/* Target Days Multiselect Checkboxes */}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                Hari Tujuan (Duplikat Ke)
              </label>
              <div className="space-y-2 border border-zinc-100 dark:border-zinc-800 p-3 rounded-xl max-h-40 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-850">
                {daysList
                  .filter((d) => d.value !== sourceDay)
                  .map((day) => {
                    const isChecked = targetDays.includes(day.value);
                    return (
                      <label
                        key={day.value}
                        className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTargetDayToggle(day.value)}
                          className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        {day.label}
                      </label>
                    );
                  })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 mt-3"
            >
              <Copy className="w-4 h-4" /> Duplikasi Sekarang
            </button>
          </form>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-400">
          💡 Tips: Cukup buat 1 set jadwal lengkap di hari Senin, lalu gunakan fitur duplikasi ini untuk menghemat waktu pengaturan mingguan/bulanan.
        </div>
      </div>
    </div>
  );
};
