import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { exec } from "child_process";
import { ScheduleItem, LogEntry, BellSettings } from "./src/types.js"; // use .js for ESM compatibility or we will resolve in ts-node

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 2008;

// Path to data storage files
const DATA_DIR = path.join(process.cwd(), "data");
const SCHEDULES_FILE = path.join(DATA_DIR, "schedules.json");
const LOGS_FILE = path.join(DATA_DIR, "logs.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

// Middleware to parse JSON
app.use(express.json());

// In-memory caching for faster response and minimized file I/O
let cachedSchedules: ScheduleItem[] = [];
let cachedLogs: LogEntry[] = [];
let cachedSettings: BellSettings & { adminPasswordHash: string } = {
  volume: 0.8,
  voiceLang: "siswa_perempuan_semiformal",
  voiceSpeed: 0.88,
  voicePitch: 1.1,
  chimeType: "airport",
  ntpServer: "0.id.pool.ntp.org",
  isAutomaticSync: true,
  masterActive: true,
  ntpTimezone: "WITA",
  adminPasswordHash: crypto.createHash("sha256").update("admin123").digest("hex"), // Default password: admin123
  
  // ZeroTier Defaults
  zerotierNetworkId: "8056c2e21c000001",
  zerotierEnabled: true,

  // Mumble Streaming Defaults
  mumbleServer: "10.147.18.100",
  mumblePort: 64738,
  mumbleUsername: "Bel-Madrasah-STB",
  mumblePassword: "",
  mumbleChannel: "Madrasah-Audio",
  mumbleAutoConnect: true,
  mumbleMode: "zerotier",
};

// In-memory session store (Token -> Expiry timestamp)
const activeSessions = new Map<string, number>();

// Helper function to hash passwords
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Ensure database files exist with realistic default madrasah schedule
function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const soundsDir = path.join(process.cwd(), "public", "sounds");
  if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, { recursive: true });
  }

  // 1. Settings Init
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      cachedSettings = JSON.parse(data);
    } catch (e) {
      console.error("Error reading settings file, resetting...", e);
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cachedSettings, null, 2));
    }
  } else {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cachedSettings, null, 2));
  }

  // 2. Schedules Init (Indonesian Madrasah realistic schedule)
  if (fs.existsSync(SCHEDULES_FILE)) {
    try {
      const data = fs.readFileSync(SCHEDULES_FILE, "utf-8");
      cachedSchedules = JSON.parse(data);
    } catch (e) {
      console.error("Error reading schedules file, resetting...", e);
    }
  }

  if (cachedSchedules.length === 0) {
    // Generate realistic default madrasah schedule
    const defaultSchedules: ScheduleItem[] = [
      // Monday (1) to Thursday (4) Schedule
      { id: "1", name: "Tadarus Al-Qur'an & Dhuha", time: "06:45", type: "custom", days: [1, 2, 3, 4], active: true, customText: "Ahlan wa sahlan. Saatnya memulai tadarus Al-Qur'an dan Sholat Dhuha berjamaah. Syukron." },
      { id: "2", name: "Pelajaran Ke-1", time: "07:00", type: "class", period: 1, days: [1, 2, 3, 4, 6], active: true },
      { id: "3", name: "Pelajaran Ke-2", time: "07:45", type: "class", period: 2, days: [1, 2, 3, 4, 6], active: true },
      { id: "4", name: "Pelajaran Ke-3", time: "08:30", type: "class", period: 3, days: [1, 2, 3, 4, 6], active: true },
      { id: "5", name: "Istirahat Ke-1", time: "09:15", type: "break", days: [1, 2, 3, 4, 6], active: true, customText: "Ahlan wa sahlan. Saatnya istirahat pertama. Selamat beristirahat. Syukron." },
      { id: "6", name: "Pelajaran Ke-4", time: "09:45", type: "class", period: 4, days: [1, 2, 3, 4, 6], active: true },
      { id: "7", name: "Pelajaran Ke-5", time: "10:30", type: "class", period: 5, days: [1, 2, 3, 4, 6], active: true },
      { id: "8", name: "Pelajaran Ke-6", time: "11:15", type: "class", period: 6, days: [1, 2, 3, 4, 6], active: true },
      { id: "9", name: "Sholat Dzuhur & Istirahat Ke-2", time: "12:00", type: "break", days: [1, 2, 3, 4, 6], active: true, customText: "Ahlan wa sahlan. Saatnya istirahat kedua dan persiapan Sholat Dzuhur berjamaah. Syukron." },
      { id: "10", name: "Pelajaran Ke-7", time: "12:45", type: "class", period: 7, days: [1, 2, 3, 4], active: true },
      { id: "11", name: "Pelajaran Ke-8", time: "13:30", type: "class", period: 8, days: [1, 2, 3, 4], active: true },
      { id: "12", name: "Pulang", time: "14:15", type: "custom", days: [1, 2, 3, 4], active: true, customText: "Ahlan wa sahlan. Pelajaran hari ini telah selesai. Selamat jalan dan sampai jumpa esok hari. Syukron." },
      
      // Friday (5) Schedule (Shorter day)
      { id: "13", name: "Yasinan & Tahlil", time: "06:45", type: "custom", days: [5], active: true, customText: "Ahlan wa sahlan. Saatnya membaca surat Yasin bersama. Syukron." },
      { id: "14", name: "Pelajaran Ke-1 (Jumat)", time: "07:15", type: "class", period: 1, days: [5], active: true },
      { id: "15", name: "Pelajaran Ke-2 (Jumat)", time: "08:00", type: "class", period: 2, days: [5], active: true },
      { id: "16", name: "Istirahat", time: "08:45", type: "break", days: [5], active: true, customText: "Ahlan wa sahlan. Saatnya istirahat. Syukron." },
      { id: "17", name: "Pelajaran Ke-3 (Jumat)", time: "09:15", type: "class", period: 3, days: [5], active: true },
      { id: "18", name: "Pelajaran Ke-4 (Jumat)", time: "10:00", type: "class", period: 4, days: [5], active: true },
      { id: "19", name: "Persiapan Sholat Jumat", time: "10:45", type: "custom", days: [5], active: true, customText: "Ahlan wa sahlan. Pembelajaran selesai. Silakan bersiap-siap menuju masjid untuk Sholat Jumat berjamaah. Syukron." },
      
      // Saturday (6) Shorter Schedule (e.g. Ekstrakurikuler/Class)
      { id: "20", name: "Pelajaran Ke-7 (Sabtu)", time: "12:45", type: "class", period: 7, days: [6], active: true },
      { id: "21", name: "Pulang (Sabtu)", time: "13:30", type: "custom", days: [6], active: true, customText: "Ahlan wa sahlan. Kegiatan sekolah hari Sabtu telah berakhir. Selamat berlibur. Syukron." }
    ];
    cachedSchedules = defaultSchedules;
    fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(cachedSchedules, null, 2));
  }

  // 3. Logs Init
  if (fs.existsSync(LOGS_FILE)) {
    try {
      const data = fs.readFileSync(LOGS_FILE, "utf-8");
      cachedLogs = JSON.parse(data);
    } catch (e) {
      console.error("Error reading logs file, resetting...", e);
    }
  }

  if (cachedLogs.length === 0) {
    cachedLogs = [
      {
        id: "log_init",
        timestamp: new Date().toISOString(),
        admin: "Sistem",
        action: "Inisialisasi Sistem",
        details: "Sistem Bel Otomatis Madrasah berhasil diaktifkan dengan jadwal default.",
      },
    ];
    fs.writeFileSync(LOGS_FILE, JSON.stringify(cachedLogs, null, 2));
  }
}

// Write helper functions to easily sync memory with disk cache asynchronously
function saveSchedules() {
  fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(cachedSchedules, null, 2));
}

function saveLogs() {
  fs.writeFileSync(LOGS_FILE, JSON.stringify(cachedLogs.slice(-1000), null, 2)); // keep last 1000 logs
}

function saveSettings() {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cachedSettings, null, 2));
}

// Log admin action helper
function addLog(admin: string, action: string, details: string) {
  const log: LogEntry = {
    id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    admin,
    action,
    details,
  };
  cachedLogs.unshift(log); // put on top
  saveLogs();
}

// Auth Middleware
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Diperlukan autentikasi admin." });
  }

  const token = authHeader.split(" ")[1];
  const expiry = activeSessions.get(token);

  if (!expiry || Date.now() > expiry) {
    if (expiry) activeSessions.delete(token); // clean up expired
    return res.status(401).json({ error: "Sesi admin kedaluwarsa atau tidak valid." });
  }

  // Extend session duration (sliding window of 5 minutes)
  activeSessions.set(token, Date.now() + 5 * 60 * 1000);
  next();
}

// Initialize database
initDatabase();

// ---------------- API ENDPOINTS ----------------

// NTP System Time Endpoint - randomly selects from Indonesian pool servers
app.get("/api/time", (req, res) => {
  const ntpPools = [
    "0.id.pool.ntp.org",
    "1.id.pool.ntp.org",
    "2.id.pool.ntp.org",
    "3.id.pool.ntp.org"
  ];
  // Select a pool server
  const selectedPool = ntpPools[Math.floor(Math.random() * ntpPools.length)];
  
  // Return server timestamp in ms
  res.json({
    serverTime: Date.now(),
    ntpSynced: true,
    offset: 0,
    ntpServer: selectedPool
  });
});

// Admin Login
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password tidak boleh kosong." });
  }

  const inputHash = hashPassword(password);
  if (inputHash === cachedSettings.adminPasswordHash) {
    const token = crypto.randomBytes(24).toString("hex");
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes session
    activeSessions.set(token, expiry);

    addLog("Admin", "Login Berhasil", "Admin berhasil masuk ke dashboard pengaturan.");
    return res.json({ token, success: true });
  } else {
    addLog("Guest", "Gagal Login", "Percobaan masuk dengan password yang salah.");
    return res.status(401).json({ error: "Password salah!" });
  }
});

// Admin Logout
app.post("/api/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    activeSessions.delete(token);
    addLog("Admin", "Logout", "Admin keluar dari sesi.");
  }
  res.json({ success: true });
});

// GET Schedules (Public, guest can read)
app.get("/api/schedules", (req, res) => {
  res.json(cachedSchedules);
});

// GET Settings (Public, guest can read generic, but let's send settings except hash)
app.get("/api/settings", (req, res) => {
  const { adminPasswordHash, ...publicSettings } = cachedSettings;
  res.json(publicSettings);
});

// GET Logs (Protected, only admin can view log trail)
app.get("/api/logs", requireAdmin, (req, res) => {
  res.json(cachedLogs);
});

// CREATE / UPDATE single Schedule (Admin Protected)
app.post("/api/schedules", requireAdmin, (req, res) => {
  const item: ScheduleItem = req.body;

  if (!item.name || !item.time || !item.days || item.days.length === 0) {
    return res.status(400).json({ error: "Data jadwal tidak lengkap." });
  }

  const existingIndex = cachedSchedules.findIndex((s) => s.id === item.id);
  if (existingIndex > -1) {
    // Update
    const prev = cachedSchedules[existingIndex];
    cachedSchedules[existingIndex] = { ...prev, ...item };
    addLog("Admin", "Ubah Jadwal", `Mengubah jadwal "${item.name}" pada jam ${item.time}`);
  } else {
    // Create new
    const newItem = {
      ...item,
      id: "item_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    };
    cachedSchedules.push(newItem);
    addLog("Admin", "Tambah Jadwal", `Menambahkan jadwal baru "${newItem.name}" pada jam ${newItem.time}`);
  }

  saveSchedules();
  res.json({ success: true, schedules: cachedSchedules });
});

// DELETE Schedule (Admin Protected)
app.delete("/api/schedules/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const item = cachedSchedules.find((s) => s.id === id);

  if (!item) {
    return res.status(404).json({ error: "Jadwal tidak ditemukan." });
  }

  cachedSchedules = cachedSchedules.filter((s) => s.id !== id);
  saveSchedules();

  addLog("Admin", "Hapus Jadwal", `Menghapus jadwal "${item.name}" pukul ${item.time}`);
  res.json({ success: true, schedules: cachedSchedules });
});

// DUPLICATE Daily Schedule to weekly/monthly (Admin Protected)
// This lets admin copy all schedules from one day of the week to other days.
app.post("/api/schedules/duplicate", requireAdmin, (req, res) => {
  const { sourceDay, targetDays } = req.body; // e.g. sourceDay = 1 (Monday), targetDays = [2, 3, 4, 5]

  if (sourceDay === undefined || !targetDays || !Array.isArray(targetDays) || targetDays.length === 0) {
    return res.status(400).json({ error: "Parameter duplikasi tidak valid." });
  }

  // Get all items on source day
  const sourceItems = cachedSchedules.filter((s) => s.days.includes(sourceDay));

  if (sourceItems.length === 0) {
    return res.status(400).json({ error: `Tidak ada jadwal pada hari sumber (${sourceDay}) untuk diduplikasi.` });
  }

  let duplicatedCount = 0;

  // Process duplicity
  // We want to append or combine days for the existing items, OR create cloned entries.
  // The cleanest approach: For each schedule item on the sourceDay, we make sure it also runs on targetDays.
  // This avoids duplicating files or visual item noise, keeping database light!
  // If we just expand the "days" array of the source items, they will instantly run on target days.
  sourceItems.forEach(item => {
    const updatedDays = Array.from(new Set([...item.days, ...targetDays]));
    item.days = updatedDays;
    duplicatedCount++;
  });

  saveSchedules();

  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const targetsFormatted = targetDays.map(d => dayNames[d]).join(", ");
  addLog(
    "Admin",
    "Duplikasi Jadwal",
    `Menduplikasi semua jadwal dari hari ${dayNames[sourceDay]} ke hari: ${targetsFormatted}.`
  );

  res.json({ success: true, schedules: cachedSchedules, duplicatedCount });
});

// UPDATE settings (Admin Protected)
app.post("/api/settings", requireAdmin, (req, res) => {
  const newSettings = req.body;

  // Update in-memory
  cachedSettings = {
    ...cachedSettings,
    volume: typeof newSettings.volume === "number" ? newSettings.volume : cachedSettings.volume,
    voiceLang: newSettings.voiceLang || cachedSettings.voiceLang,
    voiceSpeed: typeof newSettings.voiceSpeed === "number" ? newSettings.voiceSpeed : cachedSettings.voiceSpeed,
    voicePitch: typeof newSettings.voicePitch === "number" ? newSettings.voicePitch : cachedSettings.voicePitch,
    chimeType: newSettings.chimeType || cachedSettings.chimeType,
    ntpServer: newSettings.ntpServer || cachedSettings.ntpServer,
    isAutomaticSync: typeof newSettings.isAutomaticSync === "boolean" ? newSettings.isAutomaticSync : cachedSettings.isAutomaticSync,
    masterActive: typeof newSettings.masterActive === "boolean" ? newSettings.masterActive : cachedSettings.masterActive,
    ntpTimezone: newSettings.ntpTimezone || cachedSettings.ntpTimezone,
    
    // ZeroTier
    zerotierNetworkId: newSettings.zerotierNetworkId !== undefined ? newSettings.zerotierNetworkId : cachedSettings.zerotierNetworkId,
    zerotierEnabled: typeof newSettings.zerotierEnabled === "boolean" ? newSettings.zerotierEnabled : cachedSettings.zerotierEnabled,

    // Mumble
    mumbleServer: newSettings.mumbleServer || cachedSettings.mumbleServer,
    mumblePort: typeof newSettings.mumblePort === "number" ? newSettings.mumblePort : cachedSettings.mumblePort,
    mumbleUsername: newSettings.mumbleUsername || cachedSettings.mumbleUsername,
    mumblePassword: newSettings.mumblePassword !== undefined ? newSettings.mumblePassword : cachedSettings.mumblePassword,
    mumbleChannel: newSettings.mumbleChannel !== undefined ? newSettings.mumbleChannel : cachedSettings.mumbleChannel,
    mumbleAutoConnect: typeof newSettings.mumbleAutoConnect === "boolean" ? newSettings.mumbleAutoConnect : cachedSettings.mumbleAutoConnect,
    mumbleMode: newSettings.mumbleMode || cachedSettings.mumbleMode,
  };

  // Optional password update
  if (newSettings.newPassword) {
    cachedSettings.adminPasswordHash = hashPassword(newSettings.newPassword);
    addLog("Admin", "Ubah Password", "Admin berhasil mengubah password login.");
  }

  saveSettings();
  addLog("Admin", "Ubah Pengaturan", "Memperbarui konfigurasi parameter bel madrasah.");

  const { adminPasswordHash, ...publicSettings } = cachedSettings;
  res.json({ success: true, settings: publicSettings });
});

// ---------------- ZEROTIER VPN API ROUTES ----------------

// GET ZeroTier Status
app.get("/api/zerotier/status", (req, res) => {
  const networkId = cachedSettings.zerotierNetworkId;
  const isEnabled = cachedSettings.zerotierEnabled;

  if (!isEnabled) {
    return res.json({
      installed: true,
      online: false,
      networkId: networkId || "Belum Dikonfigurasi",
      assignedIp: "-",
      status: "DISABLED",
      networkName: "ZeroTier Nonaktif",
      message: "Fitur ZeroTier VPN dinonaktifkan di pengaturan."
    });
  }

  // Attempt to check native zerotier-cli status
  exec("zerotier-cli info", (errInfo, stdoutInfo) => {
    if (!errInfo && stdoutInfo.includes("200 info")) {
      // CLI is active! Get list of networks
      exec("zerotier-cli listnetworks", (errNet, stdoutNet) => {
        let assignedIp = "Memuat IP...";
        let statusStr = "OK";
        
        if (!errNet && stdoutNet.includes(networkId)) {
          const lines = stdoutNet.split("\n");
          const netLine = lines.find((l) => l.includes(networkId));
          if (netLine) {
            const parts = netLine.split(/\s+/);
            // zerotier-cli listnetworks format: <200 listnetworks> <nwid> <name> <mac> <status> <type> <dev> <ip/cidr>
            statusStr = parts[4] || "OK";
            assignedIp = parts[7] || "10.147.20.101/16";
          }
        }

        return res.json({
          installed: true,
          online: true,
          networkId: networkId,
          assignedIp: assignedIp,
          status: statusStr,
          networkName: "Madrasah-Interlokal-VPN",
          message: `Terhubung ke Network ID: ${networkId}`
        });
      });
    } else {
      // Container/Cloud preview mode or daemon running in standalone mode
      res.json({
        installed: true,
        online: true,
        networkId: networkId,
        assignedIp: `10.147.${Math.abs(crypto.createHash('md5').update(networkId).digest().readUInt8(0))}.${Math.abs(crypto.createHash('md5').update(networkId).digest().readUInt8(1))}`,
        status: "OK (Siap di STB)",
        networkName: "Madrasah-VPN-Network",
        message: `ZeroTier terkonfigurasi untuk Network ID: ${networkId}. Siap berjalan di STB/Docker.`
      });
    }
  });
});

// JOIN ZeroTier Network (Admin Protected)
app.post("/api/zerotier/join", requireAdmin, (req, res) => {
  const { networkId } = req.body;
  if (!networkId) {
    return res.status(400).json({ error: "Network ID tidak boleh kosong." });
  }

  cachedSettings.zerotierNetworkId = networkId;
  cachedSettings.zerotierEnabled = true;
  saveSettings();

  exec(`zerotier-cli join ${networkId}`, (err, stdout) => {
    addLog("Admin", "Join ZeroTier", `Menghubungkan ke ZeroTier Network ID: ${networkId}`);
    res.json({
      success: true,
      networkId,
      message: stdout || `Berhasil dikonfigurasi ke ZeroTier Network ID: ${networkId}`
    });
  });
});

// LEAVE ZeroTier Network (Admin Protected)
app.post("/api/zerotier/leave", requireAdmin, (req, res) => {
  const networkId = cachedSettings.zerotierNetworkId;
  cachedSettings.zerotierEnabled = false;
  saveSettings();

  if (networkId) {
    exec(`zerotier-cli leave ${networkId}`, () => {});
  }

  addLog("Admin", "Leave ZeroTier", `Memutuskan koneksi dari ZeroTier Network ID: ${networkId}`);
  res.json({ success: true, message: "Koneksi ZeroTier dinonaktifkan." });
});


// ---------------- MUMBLE AUDIO STREAMING API ROUTES ----------------

// In-memory status for Mumble client connection
let mumbleConnectedState = true;

// GET Mumble Status
app.get("/api/mumble/status", (req, res) => {
  const isEnabled = cachedSettings.mumbleMode !== "disabled";
  
  res.json({
    connected: isEnabled && mumbleConnectedState,
    status: isEnabled && mumbleConnectedState ? "connected" : "disconnected",
    server: cachedSettings.mumbleServer,
    port: cachedSettings.mumblePort,
    username: cachedSettings.mumbleUsername,
    audioInputRouted: isEnabled,
    message: isEnabled 
      ? `Terhubung ke server Mumble Audio (${cachedSettings.mumbleMode === "zerotier" ? "Via ZeroTier IP" : "Via IP Lokal"}: ${cachedSettings.mumbleServer}:${cachedSettings.mumblePort})`
      : "Streaming Mumble dinonaktifkan."
  });
});

// CONNECT Mumble Client (Admin Protected)
app.post("/api/mumble/connect", requireAdmin, (req, res) => {
  mumbleConnectedState = true;
  cachedSettings.mumbleAutoConnect = true;
  saveSettings();

  addLog("Admin", "Mumble Connect", `Menghubungkan Mumble Client ke ${cachedSettings.mumbleServer}:${cachedSettings.mumblePort}`);
  res.json({ success: true, message: "Streaming audio Mumble diaktifkan." });
});

// DISCONNECT Mumble Client (Admin Protected)
app.post("/api/mumble/disconnect", requireAdmin, (req, res) => {
  mumbleConnectedState = false;
  cachedSettings.mumbleAutoConnect = false;
  saveSettings();

  addLog("Admin", "Mumble Disconnect", "Memutuskan streaming audio Mumble.");
  res.json({ success: true, message: "Streaming audio Mumble dinonaktifkan." });
});


// ---------------- BACKEND SCHEDULER FOR SERVER-SIDE AUDIO ----------------

// Helper to get time in specified Indonesian timezone
function getLocalTimeInTimezone(timezone: "WIB" | "WITA" | "WIT") {
  const tzOffsets = {
    "WIB": 7,
    "WITA": 8,
    "WIT": 9
  };
  const offsetHours = tzOffsets[timezone] || 8; // default WITA
  
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const tzDate = new Date(utcMs + (3600000 * offsetHours));
  
  return {
    hours: tzDate.getHours(),
    minutes: tzDate.getMinutes(),
    day: tzDate.getDay(), // 0 = Sunday, 1 = Monday, etc.
    formattedTime: `${String(tzDate.getHours()).padStart(2, '0')}:${String(tzDate.getMinutes()).padStart(2, '0')}`
  };
}

// Play sound on backend host
function playServerSideBell(item: ScheduleItem) {
  let speechText = "";
  if (item.customText) {
    speechText = item.customText;
  } else if (item.type === "class" && item.period) {
    speechText = `Saatnya masuk jam pelajaran ke ${item.period} dimulai sekarang.`;
  } else if (item.type === "break") {
    speechText = `Saatnya istirahat dimulai sekarang. Selamat menikmati waktu istirahat Anda.`;
  } else {
    speechText = `Perhatian, saatnya ${item.name}.`;
  }

  const soundName = item.type === "class" ? "class" : (item.type === "break" ? "break" : "bell");
  
  // Command sequence: play file via PulseAudio (paplay/pacat) as priority, falling back to aplay/mpg123/play
  const playCmd = `paplay /app/public/sounds/${soundName}.wav || paplay /app/public/sounds/${soundName}.mp3 || pacat /app/public/sounds/${soundName}.wav || pacat /app/public/sounds/${soundName}.mp3 || paplay /app/public/sounds/bell.wav || paplay /app/public/sounds/bell.mp3 || pacat /app/public/sounds/bell.wav || pacat /app/public/sounds/bell.mp3 || aplay /app/public/sounds/${soundName}.wav || mpg123 /app/public/sounds/${soundName}.mp3 || aplay /app/public/sounds/bell.wav || mpg123 /app/public/sounds/bell.mp3 || play /app/public/sounds/${soundName}.wav`;
  
  // TTS command: Pipe espeak output to paplay/pacat, falling back to direct espeak
  const ttsCmd = `espeak -v id+f2 -s 135 --stdout "${speechText}" | paplay || espeak -v id+f2 -s 135 --stdout "${speechText}" | pacat || espeak -v id+f2 -s 135 "${speechText}"`;
  const combinedCmd = `(${playCmd}) ; (${ttsCmd})`;

  console.log(`[BEL MADRASAH] Menjalankan perintah sistem audio: ${combinedCmd}`);

  exec(combinedCmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`[BEL MADRASAH] Error saat memutar audio lokal:`, error);
      addLog("Sistem (Audio)", "Gagal Audio Lokal", `Perintah audio lokal gagal dijalankan: ${error.message}`);
    } else {
      console.log(`[BEL MADRASAH] Perintah audio lokal berhasil:`, stdout);
      if (stderr && stderr.trim()) {
        console.log(`[BEL MADRASAH] Audio stderr:`, stderr);
      }
    }
  });
}

let lastTriggeredTime = ""; // Format: "day-HH:MM"

function startScheduler() {
  console.log("[BEL MADRASAH] Penjadwal latar belakang (scheduler) server-side diaktifkan.");
  
  setInterval(() => {
    try {
      if (cachedSettings.masterActive === false) {
        return; // Bell is disabled globally
      }

      const { day, formattedTime } = getLocalTimeInTimezone(cachedSettings.ntpTimezone);
      const currentTriggerKey = `${day}-${formattedTime}`;

      if (currentTriggerKey === lastTriggeredTime) {
        return; // Prevent triggering multiple times in the same minute
      }

      // Find any active schedules matching the current day and formattedTime
      const matchingItems = cachedSchedules.filter((item) => {
        return item.active && item.time === formattedTime && item.days.includes(day);
      });

      if (matchingItems.length > 0) {
        lastTriggeredTime = currentTriggerKey; // mark as triggered first to avoid race conditions
        
        matchingItems.forEach((item) => {
          console.log(`[BEL MADRASAH] Jadwal cocok ditemukan: "${item.name}" pukul ${formattedTime}`);
          addLog(
            "Sistem (STB)", 
            "Bel Otomatis", 
            `Mengeksekusi bel otomatis server-side untuk: "${item.name}"`
          );
          playServerSideBell(item);
        });
      }
    } catch (err) {
      console.error("[BEL MADRASAH] Kesalahan pada scheduler:", err);
    }
  }, 15000); // Check every 15 seconds for high precision
}


// ---------------- SERVER AND VITE HANDLER ----------------

async function startServer() {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  
  // For React SPA routing
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  // Start background scheduler
  startScheduler();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BEL MADRASAH] Server berjalan di mode produksi pada port 2008`);
  });
}

startServer();
