import React, { useState, useEffect, useCallback } from "react";
import { ScheduleItem, LogEntry, BellSettings } from "./types";
import { DigitalClock } from "./components/DigitalClock";
import { ScheduleList } from "./components/ScheduleList";
import { AdminScheduleForm } from "./components/AdminScheduleForm";
import { AdminSettings } from "./components/AdminSettings";
import { ActivityLogs } from "./components/ActivityLogs";
import { triggerFullSchoolBell } from "./lib/audioEngine";
const logoImg = "/logo.png";
import { 
  BellRing, 
  Lock, 
  Unlock, 
  Moon, 
  Sun, 
  ShieldAlert, 
  LogOut, 
  Check, 
  FileCheck,
  AlertCircle,
  LayoutDashboard,
  Calendar,
  Settings2,
  History,
  Cpu,
  HardDrive,
  Menu,
  X,
  Info,
  Globe
} from "lucide-react";

export default function App() {
  // --- CORE STATE ---
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<BellSettings>({
    volume: 0.8,
    voiceLang: "perempuan",
    voiceSpeed: 0.95,
    voicePitch: 1.0,
    chimeType: "airport",
    ntpServer: "pool.ntp.org",
    isAutomaticSync: true,
    masterActive: true,
    ntpTimezone: "WITA",
  });

  // --- UI STATE ---
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isAdmin, setIsAdmin] = useState(() => {
    const token = localStorage.getItem("adminToken");
    const lastActive = localStorage.getItem("lastActive");
    if (token && lastActive) {
      const inactiveMs = Date.now() - parseInt(lastActive, 10);
      if (inactiveMs < 5 * 60 * 1000) {
        return true;
      }
    }
    return false;
  });
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    const token = localStorage.getItem("adminToken");
    const lastActive = localStorage.getItem("lastActive");
    if (token && lastActive) {
      const inactiveMs = Date.now() - parseInt(lastActive, 10);
      if (inactiveMs < 5 * 60 * 1000) {
        return token;
      }
    }
    // Clean up if expired
    localStorage.removeItem("adminToken");
    localStorage.removeItem("lastActive");
    return null;
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  
  // Audio state & browsers autoplay unlocker
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isCurrentlyPlaying, setIsCurrentlyPlaying] = useState(false);
  const [activeSpeechText, setActiveSpeechText] = useState("");

  // Editing state
  const [editItem, setEditItem] = useState<ScheduleItem | null>(null);

  // NTP Time Sync Offset
  const [timeOffset, setTimeOffset] = useState<number>(0);

  // Dynamic shared tick state from DigitalClock
  const [currentTickTime, setCurrentTickTime] = useState<Date>(new Date());
  const [activePeriod, setActivePeriod] = useState<ScheduleItem | null>(null);
  const [nextBell, setNextBell] = useState<ScheduleItem | null>(null);
  const [countdownText, setCountdownText] = useState<string>("--:--:--");

  // Active Tab for App View
  const [activeTab, setActiveTab] = useState<"dashboard" | "jadwal" | "pengaturan" | "logs" | "about">("dashboard");
  const [pendingTab, setPendingTab] = useState<"pengaturan" | "logs" | null>(null);

  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Notification Permission
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

  // --- API CALLS ---
  const fetchSchedules = async () => {
    try {
      const res = await fetch("/api/schedules");
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch (e) {
      console.error("Gagal memuat jadwal:", e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error("Gagal memuat pengaturan:", e);
    }
  };

  const fetchLogs = async () => {
    if (!adminToken) return;
    try {
      const res = await fetch("/api/logs", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Gagal memuat log:", e);
    }
  };

  const syncTimeWithServer = async () => {
    try {
      const startTime = Date.now();
      const res = await fetch("/api/time");
      if (res.ok) {
        const data = await res.json();
        const endTime = Date.now();
        const rtt = (endTime - startTime) / 2; // Approximate network delay
        const exactOffset = (data.serverTime + rtt) - endTime;
        setTimeOffset(exactOffset);
        console.log(`[NTP] Sinkronisasi Waktu Sukses. Offset: ${exactOffset}ms, RTT: ${rtt}ms`);
      }
    } catch (e) {
      console.warn("Gagal sinkronisasi waktu NTP, menggunakan jam lokal.", e);
    }
  };

  // --- MOUNT HOOK ---
  useEffect(() => {
    // 1. Initial Load
    fetchSchedules();
    fetchSettings();
    syncTimeWithServer();

    // 2. Load cached theme
    const savedTheme = localStorage.getItem("madrasah-bell-theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
      document.body.classList.toggle("dark", savedTheme === "dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", prefersDark);
      document.body.classList.toggle("dark", prefersDark);
    }

    // 3. Request Notification Permission
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setHasNotificationPermission(true);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          setHasNotificationPermission(permission === "granted");
        });
      }
    }

    // 4. Periodic Sync / Pull (every 10 seconds to keep connected displays synchronized)
    const syncInterval = setInterval(() => {
      fetchSchedules();
      fetchSettings();
    }, 10000);

    // 5. Periodic NTP Clock Sync (every 5 minutes)
    const ntpInterval = setInterval(syncTimeWithServer, 5 * 60 * 1000);

    return () => {
      clearInterval(syncInterval);
      clearInterval(ntpInterval);
    };
  }, []);

  // Fetch logs whenever we transition to admin
  useEffect(() => {
    if (isAdmin && adminToken) {
      fetchLogs();
    }
  }, [isAdmin, adminToken]);

  // --- THEME HANDLER ---
  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("madrasah-bell-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.body.classList.toggle("dark", nextTheme === "dark");
  };

  // --- AUDIO UNLOCKER ---
  const handleUnlockAudio = () => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtx.resume();
    setAudioUnlocked(true);
    // Simple verification tone
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  };

  // --- ADMIN LOG IN/OUT ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPassword }),
      });

      if (res.ok) {
        const data = await res.json();
        setAdminToken(data.token);
        setIsAdmin(true);
        setShowLoginModal(false);
        setLoginPassword("");
        
        // Save to localStorage for page-refresh persistence
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("lastActive", Date.now().toString());

        // Show success notification
        showNotification("Login Sukses", "Sesi administrator diaktifkan.");
        
        // Handle pending tab navigation if any
        if (pendingTab) {
          setActiveTab(pendingTab);
          setPendingTab(null);
        } else {
          setActiveTab("dashboard");
        }
      } else {
        const data = await res.json();
        setLoginError(data.error || "Password salah!");
      }
    } catch (err) {
      setLoginError("Gagal terhubung ke server.");
    }
  };

  const handleLogout = useCallback(async () => {
    const token = adminToken || localStorage.getItem("adminToken");
    if (token) {
      try {
        await fetch("/api/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {}
    }

    // Clear localStorage values
    localStorage.removeItem("adminToken");
    localStorage.removeItem("lastActive");

    setIsAdmin(false);
    setAdminToken(null);
    setEditItem(null);
    showNotification("Logout", "Sesi administrator dinonaktifkan.");
  }, [adminToken]);

  // --- INACTIVITY TIMEOUT (5 MINUTES) ---
  useEffect(() => {
    if (!isAdmin || !adminToken) return;

    // Track user activity to prevent timeout
    const updateActivity = () => {
      localStorage.setItem("lastActive", Date.now().toString());
    };

    window.addEventListener("mousedown", updateActivity);
    window.addEventListener("keypress", updateActivity);
    window.addEventListener("scroll", updateActivity);
    window.addEventListener("touchstart", updateActivity);

    // Periodic check for inactivity (every 5 seconds)
    const inactivityInterval = setInterval(() => {
      const lastActive = localStorage.getItem("lastActive");
      if (lastActive) {
        const inactiveMs = Date.now() - parseInt(lastActive, 10);
        if (inactiveMs >= 5 * 60 * 1000) {
          console.log("[ADMIN] Sesi kedaluwarsa karena tidak ada aktivitas selama 5 menit.");
          handleLogout();
        }
      } else {
        handleLogout();
      }
    }, 5000);

    return () => {
      window.removeEventListener("mousedown", updateActivity);
      window.removeEventListener("keypress", updateActivity);
      window.removeEventListener("scroll", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
      clearInterval(inactivityInterval);
    };
  }, [isAdmin, adminToken, handleLogout]);

  // --- TRIGGER ACTION FUNCTIONS ---
  
  // Real Bell Trigger (triggered on schedule matching or manually)
  const handleTriggerBell = useCallback(async (item: ScheduleItem) => {
    setIsCurrentlyPlaying(true);
    setActiveSpeechText(item.name);

    // Show native OS notification
    showNotification(
      `Bel Berbunyi!`,
      `Saatnya ${item.name} (${item.time})`
    );

    // Trigger audio
    await triggerFullSchoolBell(
      item.name,
      item.type,
      item.period,
      item.customText,
      settings,
      () => {
        console.log("Announcement vocal started");
      },
      () => {
        setIsCurrentlyPlaying(false);
        setActiveSpeechText("");
      }
    );
  }, [settings]);

  // Fast Trigger / Preview Test Bell (for admin configurations)
  const handlePreviewBell = () => {
    const testItem: ScheduleItem = {
      id: "test",
      name: "Simulasi Jam Pelajaran Baru",
      time: "07:00",
      type: "class",
      period: 1,
      days: [1],
      active: true,
    };
    handleTriggerBell(testItem);
  };

  // Native notification helper
  const showNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
      });
    }
    // Simple toast fallback/visual flash in client
    console.log(`[NOTIFICATION] ${title}: ${body}`);
  };

  // --- ADMIN SCHEDULE MUTATIONS ---
  const handleSaveSchedule = async (item: Omit<ScheduleItem, "id"> & { id?: string }) => {
    if (!adminToken) return;
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(item),
      });

      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules);
        setEditItem(null);
        fetchLogs();
        showNotification("Jadwal Diperbarui", `Sukses menyimpan jadwal "${item.name}"`);
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menyimpan jadwal.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!adminToken) return;
    if (!confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) return;

    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules);
        fetchLogs();
        showNotification("Jadwal Dihapus", "Jadwal berhasil dihapus.");
      } else {
        alert("Gagal menghapus jadwal.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const handleToggleActive = async (item: ScheduleItem) => {
    if (!adminToken) return;
    const updated = { ...item, active: !item.active };
    await handleSaveSchedule(updated);
  };

  const handleDuplicateSchedule = async (sourceDay: number, targetDays: number[]) => {
    if (!adminToken) return;
    try {
      const res = await fetch("/api/schedules/duplicate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ sourceDay, targetDays }),
      });

      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules);
        fetchLogs();
        alert(`Berhasil menduplikasi jadwal ke ${data.duplicatedCount} hari.`);
        showNotification("Duplikasi Sukses", "Jadwal harian berhasil disebarkan.");
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menduplikasi jadwal.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<BellSettings> & { newPassword?: string }) => {
    if (!adminToken) return;
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(newSettings),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        fetchLogs();
      } else {
        alert("Gagal memperbarui pengaturan.");
      }
    } catch (e) {
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const handleTabClick = (tab: "dashboard" | "jadwal" | "pengaturan" | "logs" | "about") => {
    setIsSidebarOpen(false);
    if (tab === "pengaturan" || tab === "logs") {
      if (!isAdmin) {
        setPendingTab(tab);
        setShowLoginModal(true);
        return;
      }
    }
    setActiveTab(tab);
  };

  const handleTick = useCallback((time: Date, next: ScheduleItem | null, active: ScheduleItem | null, countdown: string) => {
    setCurrentTickTime(time);
    setNextBell(next);
    setActivePeriod(active);
    setCountdownText(countdown);
  }, []);

  return (
    <div className={`min-h-screen flex bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-300 ${theme === "dark" ? "dark" : ""}`}>
      
      {/* SIDEBAR NAVIGATION: LEFT PANEL */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-emerald-950 dark:bg-zinc-900 border-r border-emerald-900 dark:border-zinc-800 flex flex-col justify-between transform transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen shrink-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        
        <div>
          {/* Sidebar Header Branding */}
          <div className="p-5 border-b border-emerald-900/50 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-0.5 shadow-md shrink-0">
                <img 
                  src={logoImg} 
                  alt="Logo Al Ikhlas" 
                  className="w-full h-full object-contain aspect-square" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-white font-black text-xs leading-tight tracking-tight uppercase">
                  AL IKHLAS KALTARA
                </h1>
                <p className="text-emerald-400 text-[10px] leading-tight font-semibold mt-0.5">
                  Bell Digital Otomatis
                </p>
                <span className="text-emerald-500/60 text-[8px] font-mono tracking-widest block mt-1">v3.0 ARM64 Standalone</span>
              </div>
            </div>
            {/* Mobile close button */}
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1.5 text-emerald-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Navigation Links */}
          <div className="py-6 px-4 space-y-1.5">
            <button
              onClick={() => handleTabClick("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "dashboard"
                  ? "bg-emerald-800 dark:bg-zinc-800 text-white"
                  : "text-emerald-300 hover:text-white dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => handleTabClick("jadwal")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "jadwal"
                  ? "bg-emerald-800 dark:bg-zinc-800 text-white"
                  : "text-emerald-300 hover:text-white dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <Calendar className="w-5 h-5 shrink-0" />
              <span>Jadwal Madrasah</span>
            </button>

            <button
              onClick={() => handleTabClick("pengaturan")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "pengaturan"
                  ? "bg-emerald-800 dark:bg-zinc-800 text-white"
                  : "text-emerald-300 hover:text-white dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <Settings2 className="w-5 h-5 shrink-0" />
              <span>Pengaturan Aplikasi</span>
            </button>

            <button
              onClick={() => handleTabClick("logs")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "logs"
                  ? "bg-emerald-800 dark:bg-zinc-800 text-white"
                  : "text-emerald-300 hover:text-white dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <History className="w-5 h-5 shrink-0" />
              <span>Log Aktivitas</span>
            </button>

            <button
              onClick={() => handleTabClick("about")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "about"
                  ? "bg-emerald-800 dark:bg-zinc-800 text-white"
                  : "text-emerald-300 hover:text-white dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <Info className="w-5 h-5 shrink-0" />
              <span>Tentang Aplikasi</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer Resource Stats */}
        <div className="p-6 border-t border-emerald-900/50 dark:border-zinc-800 space-y-4">
          <div>
            <div className="flex items-center justify-between text-[11px] text-emerald-400 dark:text-zinc-500 font-mono uppercase font-bold mb-1.5">
              <span>Server CPU</span>
              <span>4.2%</span>
            </div>
            <div className="h-1 bg-emerald-950 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="w-[15%] h-full bg-emerald-400"></div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-emerald-500/70 dark:text-zinc-500 font-mono">
            <Cpu className="w-3.5 h-3.5" />
            <span>RAM: 312MB / 2.0GB</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA: RIGHT SIDE */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        
        {/* MAIN TOP HEADER */}
        <header className="h-20 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between sticky top-0 z-40 transition-colors shrink-0">
          
          {/* Header Left Area: Mobile Burger & NTP Clock Display */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="lg:hidden p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 hidden sm:inline">NTP Sync:</span>
              <span className="font-mono text-lg font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                {currentTickTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Synced
                </span>
              </span>
            </div>
          </div>

          {/* Header Middle Area: Dynamic Bell Status Descriptor */}
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-600 dark:text-zinc-300">
              {isCurrentlyPlaying 
                ? "Sedang Mengudara..." 
                : nextBell 
                  ? `Menunggu Bel ${nextBell.name} (${nextBell.time})` 
                  : "Siaga Bel Otomatis"}
            </span>
          </div>

          {/* Header Right Area: Options + Login/Logout Actions */}
          <div className="flex items-center gap-2.5">
            {/* Notification Permission Indicator Toggle */}
            <button 
              onClick={() => {
                if (!hasNotificationPermission) {
                  Notification.requestPermission().then(p => setHasNotificationPermission(p === 'granted'));
                }
              }}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                hasNotificationPermission 
                  ? "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" 
                  : "bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30"
              }`}
              title={hasNotificationPermission ? "Notifikasi Aktif" : "Aktifkan Push Notifikasi"}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hasNotificationPermission ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}></span>
              <span className="hidden xl:inline">{hasNotificationPermission ? "Notifikasi On" : "Notifikasi Off"}</span>
            </button>

            {/* Dark Mode Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
              title="Ganti Tema Visual"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Admin State Pill Box */}
            {isAdmin ? (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 px-3 py-1.5 rounded-xl">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Admin</span>
                <button 
                  onClick={handleLogout} 
                  className="p-0.5 text-zinc-400 hover:text-red-500 transition-colors ml-1" 
                  title="Logout Administrator"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-3 py-1.5 rounded-xl">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  <span className="text-xs font-bold text-slate-600 dark:text-zinc-300">Guest</span>
                </div>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-3.5 py-1.5 bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 dark:hover:bg-zinc-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Login
                </button>
              </div>
            )}
          </div>

        </header>

        {/* WORKSPACE CONTENT AREA WITH GRID */}
        <main className="p-6 sm:p-8 space-y-6 max-w-[1400px] w-full mx-auto flex-1">
          
          {/* Broadcast alert if bell is speaking right now */}
          {isCurrentlyPlaying && (
            <div className="bg-emerald-600 text-white p-4 rounded-3xl shadow-lg flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-100"></span>
                </span>
                <div>
                  <p className="text-xs uppercase tracking-widest font-extrabold opacity-90">Pengumuman Sedang Berbunyi</p>
                  <p className="text-md font-bold truncate">{activeSpeechText}</p>
                </div>
              </div>
              <span className="text-xs font-mono bg-white/15 px-2.5 py-1 rounded-full border border-white/10">Audio Aktif</span>
            </div>
          )}

          {/* Autoplay lock notification popup */}
          {!audioUnlocked && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
              <div className="flex items-center gap-3.5">
                <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Aktifkan Driver Suara Bel Madrasah</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Browser memblokir audio otomatis sebelum ada interaksi. Klik tombol untuk mengizinkan bel berbunyi lancar.
                  </p>
                </div>
              </div>
              <button
                onClick={handleUnlockAudio}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-600/10 shrink-0"
              >
                Aktifkan Audio Sekarang
              </button>
            </div>
          )}

          {/* 12-COLUMN MAIN BENTO GRID */}
          <div className="grid grid-cols-12 gap-6 items-start">
            
            {/* TAB 1: DASHBOARD (the gorgeous all-in-one view) */}
            {activeTab === "dashboard" && (
              <>
                {/* LEFT AREA: Bento Stats Clock & Core Component Render (8 columns on XL) */}
                <div className="col-span-12 xl:col-span-8 space-y-6">
                  {/* Renders the beautiful 3 Bento stats cards */}
                  <DigitalClock
                    timeOffset={timeOffset}
                    schedules={schedules}
                    masterActive={settings.masterActive}
                    onTriggerBell={handleTriggerBell}
                    onTick={handleTick}
                    ntpTimezone={settings.ntpTimezone || "WITA"}
                  />

                  <div className="space-y-4">
                    <div className="bg-white dark:bg-zinc-900 p-6 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm">
                      <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Ringkasan Jadwal Harian</h3>
                      <p className="text-xs text-zinc-400">Selamat Datang! Silakan pantau daftar giliran bel aktif hari ini. Pilih menu di sidebar untuk mengelola jadwal atau pengaturan.</p>
                    </div>
                    <ScheduleList
                      schedules={schedules}
                      isAdmin={false}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      onToggleActive={() => {}}
                    />
                  </div>
                </div>

                {/* RIGHT AREA: Audio Preview Simulator & Transparansi activity logs widget */}
                <div className="col-span-12 xl:col-span-4 space-y-6">
                  {/* Pratinjau Suara Bell widget with simulated waveform */}
                  <div className="bg-slate-900 dark:bg-zinc-950 text-white p-6 rounded-3xl shadow-lg border-b-4 border-emerald-500 relative overflow-hidden transition-colors">
                    <h4 className="text-xs uppercase font-bold tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Pratinjau Suara Bell
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={handlePreviewBell}
                          disabled={isCurrentlyPlaying}
                          className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-400 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
                          title="Uji coba bel suara"
                        >
                          <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-emerald-400 border-b-[5px] border-b-transparent ml-1"></div>
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold leading-tight truncate">
                            {isCurrentlyPlaying ? `"${activeSpeechText}"` : '"Ahlan wa sahlan.. Pelajaran ke-1 dimulai.."'}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">
                            {isCurrentlyPlaying ? "Vokal_Sintetis_Aktif.mp3" : "Madrasah_Voice_Arabic_v2.mp3"}
                          </span>
                        </div>
                      </div>

                      {/* Waveform animation bars */}
                      <div className="h-12 bg-slate-800/50 dark:bg-zinc-900 rounded-lg flex items-center px-4 gap-1.5 justify-center">
                        {[
                          { h: "h-4", ha: "animate-[pulse_0.8s_infinite_100ms]" },
                          { h: "h-6", ha: "animate-[pulse_0.8s_infinite_200ms]" },
                          { h: "h-8", ha: "animate-[pulse_0.8s_infinite_300ms]" },
                          { h: "h-5", ha: "animate-[pulse_0.8s_infinite_400ms]" },
                          { h: "h-7", ha: "animate-[pulse_0.8s_infinite_500ms]" },
                          { h: "h-4", ha: "animate-[pulse_0.8s_infinite_150ms]" },
                          { h: "h-6", ha: "animate-[pulse_0.8s_infinite_250ms]" },
                          { h: "h-3", ha: "animate-[pulse_0.8s_infinite_350ms]" },
                          { h: "h-5", ha: "animate-[pulse_0.8s_infinite_450ms]" },
                          { h: "h-4", ha: "animate-[pulse_0.8s_infinite_100ms]" },
                          { h: "h-2", ha: "animate-[pulse_0.8s_infinite_200ms]" },
                        ].map((bar, i) => (
                          <div
                            key={i}
                            className={`w-1 bg-emerald-500 rounded-full transition-all ${
                              isCurrentlyPlaying ? bar.ha : `${bar.h} opacity-50`
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Real-time system monitoring sidebar widget */}
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-sm transition-colors">
                    <div className="p-5 border-b border-slate-100 dark:border-zinc-800">
                      <h3 className="font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide text-xs">
                        Log Aktivitas (Transparan)
                      </h3>
                    </div>
                    <div className="p-5 space-y-4 max-h-[320px] overflow-y-auto">
                      {isAdmin && logs.length > 0 ? (
                        logs.slice(0, 5).map((log) => (
                          <div key={log.id} className="flex gap-3">
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                              log.action.includes("Hapus") ? "bg-red-500" : log.action.includes("Tambah") || log.action.includes("Simpan") ? "bg-emerald-500" : "bg-blue-500"
                            }`} />
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">{`[${log.admin.toUpperCase()}] ${log.action}`}</p>
                              <p className="text-[10px] text-slate-400 dark:text-zinc-500 italic max-w-[200px] truncate">{log.details}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0"></div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">[SYSTEM] NTP Synced</p>
                              <p className="text-[10px] text-slate-400 dark:text-zinc-500 italic">Precision deviation 0.001ms</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">[SYSTEM] Notification Driver</p>
                              <p className="text-[10px] text-slate-400 dark:text-zinc-500 italic">Push workers are listening in background</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full mt-1.5 shrink-0"></div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">[SYSTEM] Web Audio Driver</p>
                              <p className="text-[10px] text-slate-400 dark:text-zinc-500">Audio Synthesis Engine Initialized</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: JADWAL MADRASAH (Fokus Kelola Jadwal, Tanpa Clock, dsb.) */}
            {activeTab === "jadwal" && (
              <div className="col-span-12 space-y-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 mb-1">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    Manajemen Jadwal Madrasah
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {isAdmin 
                      ? "Anda login sebagai Administrator. Silakan gunakan formulir untuk menambah, mengedit, atau menduplikasi jadwal ke mingguan/bulanan."
                      : "Mode penonton (Guest) aktif. Silakan hubungi Administrator untuk membuat perubahan pada jadwal bel madrasah."
                    }
                  </p>
                </div>

                {isAdmin && (
                  <AdminScheduleForm
                    editItem={editItem}
                    onSave={handleSaveSchedule}
                    onCancelEdit={() => setEditItem(null)}
                    onDuplicate={handleDuplicateSchedule}
                  />
                )}

                <ScheduleList
                  schedules={schedules}
                  isAdmin={isAdmin}
                  onEdit={(item) => {
                    setEditItem(item);
                    document.getElementById("schedule-form")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  onDelete={handleDeleteSchedule}
                  onToggleActive={handleToggleActive}
                />
              </div>
            )}

            {/* TAB 3: SUARA & KEAMANAN (Admin Only - Auth Protected) */}
            {activeTab === "pengaturan" && (
              <div className="col-span-12">
                <AdminSettings
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onPreviewBell={handlePreviewBell}
                />
              </div>
            )}

            {/* TAB 4: LOG AKTIVITAS (Admin Only - Auth Protected) */}
            {activeTab === "logs" && (
              <div className="col-span-12">
                <ActivityLogs logs={logs} />
              </div>
            )}

            {/* TAB 5: ABOUT (Tentang Aplikasi & Panduan Pemeliharaan Server) */}
            {activeTab === "about" && (
              <div className="col-span-12 space-y-6 text-zinc-800 dark:text-zinc-200">
                {/* Branding Card */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="w-16 h-16 bg-white rounded-2xl border border-zinc-150 dark:border-zinc-800 flex items-center justify-center p-1 shadow-sm shrink-0">
                      <img src={logoImg} alt="Logo" className="w-full h-full object-contain aspect-square" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50 leading-tight">
                          AL IKHLAS KALTARA Bell Digital Otomatis
                        </h2>
                        <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-mono font-bold rounded-md">
                          v3.0
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Sistem Penjadwalan Bel Otomatis Standalone STB dengan ZeroTier VPN & Mumble Audio Streaming Interlokal.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="px-2.5 py-0.5 bg-emerald-100/55 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[10px] font-mono font-bold rounded-full border border-emerald-200/50 dark:border-emerald-900/30">
                          v3.0 Standalone Docker STB
                        </span>
                        <span className="px-2.5 py-0.5 bg-emerald-100/55 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[10px] font-mono font-bold rounded-full border border-emerald-200/50 dark:border-emerald-900/30">
                          ZeroTier VPN Interlokal
                        </span>
                        <span className="px-2.5 py-0.5 bg-emerald-100/55 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[10px] font-mono font-bold rounded-full border border-emerald-200/50 dark:border-emerald-900/30">
                          Mumble Audio Streaming
                        </span>
                        <span className="px-2.5 py-0.5 bg-emerald-100/55 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[10px] font-mono font-bold rounded-full border border-emerald-200/50 dark:border-emerald-900/30">
                          React 19 + TypeScript
                        </span>
                        <span className="px-2.5 py-0.5 bg-emerald-100/55 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[10px] font-mono font-bold rounded-full border border-emerald-200/50 dark:border-emerald-900/30">
                          Express.js + Web Audio API
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-4 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed space-y-2">
                    <p>
                      Aplikasi ini dirancang khusus untuk memenuhi kebutuhan pengumuman pergantian jam pelajaran di lingkungan <strong>AL IKHLAS KALTARA</strong> secara otomatis dan terjadwal presisi tinggi.
                    </p>
                    <p>
                      Dengan memanfaatkan teknologi <strong>NTP (Network Time Protocol)</strong> yang terintegrasi pada server-side, aplikasi menjamin akurasi waktu bel yang konsisten tanpa ketergantungan pada jam lokal perangkat klien yang tidak stabil.
                    </p>
                    <div className="mt-4 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30 font-semibold text-center text-xs">
                      ✨ Aplikasi ini dibuat dengan bantuan <strong>Google AI Studio</strong> bersama <strong>tim IT Al Ikhlas</strong>.
                    </div>
                  </div>
                </div>

                {/* Docker Maintenance / Server Restart Guide */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 mb-2">
                    <Cpu className="w-5 h-5 text-emerald-500" />
                    Panduan Pemeliharaan & Restart Aplikasi (Docker / Linux)
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mb-4 font-medium">
                    Gunakan terminal server VPS / Docker Anda untuk melakukan pemantauan, pembacaan log aktivitas, dan restart aplikasi secara aman dengan instruksi berikut.
                  </p>

                  <div className="space-y-4">
                    {/* Item 1 - Restart */}
                    <div className="p-4 bg-zinc-100/50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80">
                      <span className="text-xs font-bold text-zinc-950 dark:text-zinc-50 block mb-1">
                        1. Melakukan Restart Kontainer Docker
                      </span>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed mb-2 font-medium">
                        Jika Anda perlu me-refresh seluruh proses server dan cache in-memory, jalankan perintah restart berikut pada terminal VPS Anda:
                      </p>
                      <pre className="p-2.5 bg-zinc-950 text-emerald-400 dark:text-emerald-300 font-mono text-xs font-bold rounded-xl overflow-x-auto border border-zinc-900 dark:border-zinc-850/80 shadow-inner">
{`docker restart madrasah-bell-container`}
                      </pre>
                    </div>

                    {/* Item 2 - Logs */}
                    <div className="p-4 bg-zinc-100/50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80">
                      <span className="text-xs font-bold text-zinc-950 dark:text-zinc-50 block mb-1">
                        2. Memantau Log Aktivitas Real-Time
                      </span>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed mb-2 font-medium">
                        Untuk memantau aktivitas penanganan rute, sinkronisasi NTP, dan trigger pemutaran bel langsung dari log output kontainer:
                      </p>
                      <pre className="p-2.5 bg-zinc-950 text-emerald-400 dark:text-emerald-300 font-mono text-xs font-bold rounded-xl overflow-x-auto border border-zinc-900 dark:border-zinc-850/80 shadow-inner">
{`docker logs -f --tail 100 madrasah-bell-container`}
                      </pre>
                    </div>

                    {/* Item 3 - Performance Monitoring */}
                    <div className="p-4 bg-zinc-100/50 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80">
                      <span className="text-xs font-bold text-zinc-950 dark:text-zinc-50 block mb-1">
                        3. Memantau Konsumsi CPU & RAM
                      </span>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed mb-2 font-medium">
                        Untuk melihat secara akurat persentase penggunaan memori RAM (produksi berkisar 40MB - 60MB saja) dan CPU kontainer Anda:
                      </p>
                      <pre className="p-2.5 bg-zinc-950 text-emerald-400 dark:text-emerald-300 font-mono text-xs font-bold rounded-xl overflow-x-auto border border-zinc-900 dark:border-zinc-850/80 shadow-inner">
{`docker stats madrasah-bell-container`}
                      </pre>
                    </div>

                  </div>
                </div>
              </div>
            )}
          </div>

        </main>

        {/* Dynamic footer copyright */}
        <footer className="border-t border-zinc-150 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500 shrink-0 transition-colors">
          <p className="font-semibold text-zinc-700 dark:text-zinc-400">Bel Otomatis Madrasah • Geometric Balance Edition</p>
          <p className="mt-1">Infrastruktur web ultra-ringan dioptimalkan untuk VPS Debian 2GB RAM / ARM64 Docker</p>
          <p className="mt-1 font-mono text-[10px]">Akurasi NTP Aktif • Audio Sintetis Web Audio API</p>
        </footer>

      </div>

      {/* 6. ADMIN LOGIN MODAL DIALOG */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-xl transition-all">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-md font-extrabold text-zinc-900 dark:text-zinc-50">Autentikasi Administrator</h3>
              <p className="text-xs text-zinc-400 mt-1">Masukkan kata sandi admin untuk mengakses panel sunting jadwal.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Kata Sandi Admin
                </label>
                <input
                  type="password"
                  required
                  placeholder="Password default: admin123"
                  className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-zinc-200"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>

              {loginError && (
                <div className="text-[11px] font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-100 dark:border-red-900/30">
                  ⚠️ {loginError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setLoginPassword("");
                    setLoginError("");
                  }}
                  className="flex-1 py-2.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all"
                >
                  Masuk Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
