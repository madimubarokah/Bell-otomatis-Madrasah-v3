import React, { useEffect, useState } from "react";
import { ScheduleItem } from "../types";

interface DigitalClockProps {
  timeOffset: number;
  schedules: ScheduleItem[];
  masterActive: boolean;
  onTriggerBell: (item: ScheduleItem) => void;
  onTick?: (time: Date, next: ScheduleItem | null, active: ScheduleItem | null, countdown: string) => void;
  ntpTimezone: "WIB" | "WITA" | "WIT";
}

export const DigitalClock: React.FC<DigitalClockProps> = ({
  timeOffset,
  schedules,
  masterActive,
  onTriggerBell,
  onTick,
  ntpTimezone,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date(Date.now() + timeOffset));
  const [nextBell, setNextBell] = useState<ScheduleItem | null>(null);
  const [countdownText, setCountdownText] = useState<string>("--:--:--");
  const [progress, setProgress] = useState<number>(0);
  const [activePeriod, setActivePeriod] = useState<ScheduleItem | null>(null);

  // Keep a set of already played times for the current day to avoid double play within the same minute
  const [playedToday, setPlayedToday] = useState<Record<string, boolean>>({});

  // Use ref for onTick to avoid infinite re-renders in parent
  const onTickRef = React.useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  // Reset playedToday at midnight
  useEffect(() => {
    const checkMidnight = setInterval(() => {
      const now = new Date(Date.now() + timeOffset);
      if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
        setPlayedToday({});
      }
    }, 1000);
    return () => clearInterval(checkMidnight);
  }, [timeOffset]);

  // Sync clock every second with ntp offset and selected timezone
  useEffect(() => {
    const timer = setInterval(() => {
      const syncedNow = new Date(Date.now() + timeOffset);
      setCurrentTime(syncedNow);

      const tzString = ntpTimezone === "WIB" ? "Asia/Jakarta" : ntpTimezone === "WIT" ? "Asia/Jayapura" : "Asia/Makassar";
      
      // Extract exact date part in selected timezone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tzString,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        weekday: "short",
        hour12: false,
      });

      let parts;
      try {
        parts = formatter.formatToParts(syncedNow);
      } catch (e) {
        // Fallback if timezone not supported or fails
        parts = new Intl.DateTimeFormat("en-US", { hour12: false }).formatToParts(syncedNow);
      }
      
      const getVal = (type: string) => parts.find((p) => p.type === type)?.value || "";
      
      const currentHour = parseInt(getVal("hour")) || syncedNow.getHours();
      const currentMinute = parseInt(getVal("minute")) || syncedNow.getMinutes();
      const currentSeconds = parseInt(getVal("second")) || syncedNow.getSeconds();
      
      // Map weekday to 0-6 index
      const weekdayStr = getVal("weekday").toLowerCase();
      const weekdayMap: Record<string, number> = {
        sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
      };
      const currentDay = weekdayMap[weekdayStr.slice(0, 3)] ?? syncedNow.getDay();

      const timeString = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;

      // 1. AUTO TRIGGER BELL CHECK (runs precisely on second 0 of matching schedule)
      if (masterActive && currentSeconds === 0) {
        const matchingSchedule = schedules.find(
          (s) => s.active && s.time === timeString && s.days.includes(currentDay)
        );

        if (matchingSchedule) {
          const playKey = `${currentDay}_${timeString}_${matchingSchedule.id}`;
          if (!playedToday[playKey]) {
            setPlayedToday((prev) => ({ ...prev, [playKey]: true }));
            onTriggerBell(matchingSchedule);
          }
        }
      }

      // 2. CALCULATE NEXT BELL AND ACTIVE ONGOING PERIOD
      const activeSchedules = schedules.filter((s) => s.active && s.days.includes(currentDay));

      if (activeSchedules.length === 0) {
        setNextBell(null);
        setActivePeriod(null);
        setCountdownText("Tidak ada jadwal");
        setProgress(0);
        onTickRef.current?.(syncedNow, null, null, "Tidak ada");
        return;
      }

      // Sort schedules chronologically
      const sortedSchedules = [...activeSchedules].sort((a, b) => {
        const [aH, aM] = a.time.split(":").map(Number);
        const [bH, bM] = b.time.split(":").map(Number);
        return aH * 60 + aM - (bH * 60 + bM);
      });

      const currentMinutesToday = currentHour * 60 + currentMinute;

      // Find ongoing period (the latest scheduled event in the past or present)
      let currentActive: ScheduleItem | null = null;
      let next: ScheduleItem | null = null;

      for (let i = 0; i < sortedSchedules.length; i++) {
        const [sH, sM] = sortedSchedules[i].time.split(":").map(Number);
        const sMinutes = sH * 60 + sM;

        if (sMinutes <= currentMinutesToday) {
          currentActive = sortedSchedules[i];
        } else {
          next = sortedSchedules[i];
          break;
        }
      }

      // If we are past all periods, the next is the first period of tomorrow or next scheduled day
      if (!next && sortedSchedules.length > 0) {
        next = sortedSchedules[0];
      }

      setActivePeriod(currentActive);
      setNextBell(next);

      let calculatedCountdown = "Tidak ada";

      if (next) {
        const [nextH, nextM] = next.time.split(":").map(Number);
        let nextMinutesToday = nextH * 60 + nextM;

        // If next bell is technically tomorrow or wrapped around
        if (nextMinutesToday <= currentMinutesToday) {
          nextMinutesToday += 24 * 60; // add 1 day in minutes
        }

        const totalDiffSeconds = (nextMinutesToday * 60) - (currentMinutesToday * 60 + currentSeconds);
        
        if (totalDiffSeconds > 0) {
          const h = Math.floor(totalDiffSeconds / 3600);
          const m = Math.floor((totalDiffSeconds % 3600) / 60);
          const s = totalDiffSeconds % 60;
          
          calculatedCountdown = `${h > 0 ? h + "j " : ""}${m}m ${s}s`;
          setCountdownText(calculatedCountdown);

          // Calculate progress bar percentage
          let startMinutes = 0;
          if (currentActive) {
            const [caH, caM] = currentActive.time.split(":").map(Number);
            startMinutes = caH * 60 + caM;
          } else {
            startMinutes = 0;
          }

          const totalInterval = nextMinutesToday - startMinutes;
          const elapsed = currentMinutesToday - startMinutes;
          const pct = totalInterval > 0 ? Math.min(100, Math.max(0, (elapsed / totalInterval) * 100)) : 0;
          setProgress(pct);
        } else {
          calculatedCountdown = "Bel Berbunyi!";
          setCountdownText(calculatedCountdown);
          setProgress(100);
        }
      } else {
        setCountdownText("Tidak ada");
      }

      // Callback to parent with updated values
      onTickRef.current?.(syncedNow, next, currentActive, calculatedCountdown);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeOffset, schedules, masterActive, playedToday, onTriggerBell, ntpTimezone]);

  // Format date indonesian
  const formatIndonesianDate = (date: Date) => {
    const tzString = ntpTimezone === "WIB" ? "Asia/Jakarta" : ntpTimezone === "WIT" ? "Asia/Jayapura" : "Asia/Makassar";
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tzString,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short"
    });
    
    let parts;
    try {
      parts = formatter.formatToParts(date);
    } catch (e) {
      parts = new Intl.DateTimeFormat("en-US").formatToParts(date);
    }
    
    const getVal = (type: string) => parts.find((p) => p.type === type)?.value || "";
    
    const year = getVal("year");
    const monthIndex = (parseInt(getVal("month")) || 1) - 1;
    const dateNum = getVal("day");
    const weekdayStr = getVal("weekday").toLowerCase();
    
    const weekdayMap: Record<string, number> = {
      sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
    };
    const dayIdx = weekdayMap[weekdayStr.slice(0, 3)] ?? date.getDay();

    const days = ["Ahad / Minggu", "Itsnain / Senin", "Tsulatsa / Selasa", "Arbi'a / Rabu", "Khomis / Kamis", "Jumu'ah / Jumat", "Sabt / Sabtu"];
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${days[dayIdx]}, ${dateNum} ${months[monthIndex]} ${year}`;
  };

  return (
    <div id="digital-clock" className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* CARD 1: Sesi Berjalan */}
      <div className="bg-white dark:bg-zinc-900 p-5 border border-slate-200 dark:border-zinc-850 rounded-2xl shadow-sm transition-colors">
        <p className="text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase mb-1 tracking-wider">Sesi Berjalan</p>
        <h3 className="text-xl font-bold text-slate-800 dark:text-zinc-100 leading-tight">
          {activePeriod ? (activePeriod.period ? `Pelajaran Ke-${activePeriod.period}` : "Sesi Aktif") : "Tidak Ada Sesi"}
        </h3>
        <p className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
          {activePeriod ? activePeriod.name : "Status Siaga / Istirahat"}
        </p>
      </div>

      {/* CARD 2: Sesi Berikutnya */}
      <div className="bg-white dark:bg-zinc-900 p-5 border border-slate-200 dark:border-zinc-850 rounded-2xl shadow-sm transition-colors">
        <p className="text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase mb-1 tracking-wider">Sesi Berikutnya</p>
        <h3 className="text-xl font-bold text-slate-800 dark:text-zinc-100 leading-tight">
          {nextBell ? `${nextBell.time} ${ntpTimezone || "WITA"}` : `--:-- ${ntpTimezone || "WITA"}`}
        </h3>
        <p className="text-slate-500 dark:text-zinc-400 mt-1 truncate">
          {nextBell ? nextBell.name : "Tidak ada jadwal bel berikutnya"}
        </p>
      </div>

      {/* CARD 3: Hitung Mundur */}
      <div className="bg-white dark:bg-zinc-900 p-5 border border-emerald-100 dark:border-emerald-950/40 rounded-2xl shadow-sm relative overflow-hidden transition-colors">
        <div className="absolute top-4 right-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-full border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center">
            <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
              {nextBell ? nextBell.time : "--:--"}
            </span>
          </div>
        </div>
        <p className="text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase mb-1 tracking-wider">Hitung Mundur</p>
        <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400 leading-tight italic mt-1 font-mono">
          {countdownText}
        </h3>
        
        {/* Progress bar overlay */}
        <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-850 rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};
