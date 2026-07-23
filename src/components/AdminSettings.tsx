import React, { useState, useEffect } from "react";
import { BellSettings, ZeroTierStatusResponse, MumbleStatusResponse } from "../types";
import { Settings, Volume2, KeyRound, Play, Radio, Shield, Network, Mic, Server, Cpu, Check, Copy, RefreshCw, Wifi, AlertCircle } from "lucide-react";

interface AdminSettingsProps {
  settings: BellSettings;
  onUpdateSettings: (settings: Partial<BellSettings> & { newPassword?: string }) => void;
  onPreviewBell: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  onUpdateSettings,
  onPreviewBell,
}) => {
  const [activeTab, setActiveTab] = useState<"general" | "zerotier" | "mumble" | "stb">("general");

  // General Settings State
  const [volume, setVolume] = useState<number>(settings.volume);
  const [voiceLang, setVoiceLang] = useState<any>(settings.voiceLang || "siswa_perempuan_semiformal");
  const [voiceSpeed, setVoiceSpeed] = useState<number>(settings.voiceSpeed);
  const [voicePitch, setVoicePitch] = useState<number>(settings.voicePitch);
  const [chimeType, setChimeType] = useState<"airport" | "classic" | "digital" | "none">(settings.chimeType);
  const [isAutomaticSync, setIsAutomaticSync] = useState<boolean>(settings.isAutomaticSync);
  const [masterActive, setMasterActive] = useState<boolean>(settings.masterActive);
  const [ntpTimezone, setNtpTimezone] = useState<"WIB" | "WITA" | "WIT">(settings.ntpTimezone || "WITA");

  // ZeroTier Settings State
  const [zerotierNetworkId, setZerotierNetworkId] = useState<string>(settings.zerotierNetworkId || "8056c2e21c000001");
  const [zerotierEnabled, setZerotierEnabled] = useState<boolean>(settings.zerotierEnabled ?? true);
  const [zerotierStatus, setZerotierStatus] = useState<ZeroTierStatusResponse | null>(null);
  const [loadingZeroTier, setLoadingZeroTier] = useState<boolean>(false);

  // Mumble Settings State
  const [mumbleServer, setMumbleServer] = useState<string>(settings.mumbleServer || "10.147.18.100");
  const [mumblePort, setMumblePort] = useState<number>(settings.mumblePort || 64738);
  const [mumbleUsername, setMumbleUsername] = useState<string>(settings.mumbleUsername || "Bel-Madrasah-STB");
  const [mumblePassword, setMumblePassword] = useState<string>(settings.mumblePassword || "");
  const [mumbleChannel, setMumbleChannel] = useState<string>(settings.mumbleChannel || "Madrasah-Audio");
  const [mumbleAutoConnect, setMumbleAutoConnect] = useState<boolean>(settings.mumbleAutoConnect ?? true);
  const [mumbleMode, setMumbleMode] = useState<"zerotier" | "local" | "disabled">(settings.mumbleMode || "zerotier");
  const [mumbleStatus, setMumbleStatus] = useState<MumbleStatusResponse | null>(null);
  const [loadingMumble, setLoadingMumble] = useState<boolean>(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Copy state
  const [copiedDocker, setCopiedDocker] = useState(false);

  // Fetch ZeroTier status
  const fetchZeroTierStatus = async () => {
    setLoadingZeroTier(true);
    try {
      const res = await fetch("/api/zerotier/status");
      const data = await res.json();
      setZerotierStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingZeroTier(false);
    }
  };

  // Fetch Mumble status
  const fetchMumbleStatus = async () => {
    setLoadingMumble(true);
    try {
      const res = await fetch("/api/mumble/status");
      const data = await res.json();
      setMumbleStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMumble(false);
    }
  };

  useEffect(() => {
    fetchZeroTierStatus();
    fetchMumbleStatus();
  }, []);

  const handleGeneralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      volume,
      voiceLang,
      voiceSpeed,
      voicePitch,
      chimeType,
      isAutomaticSync,
      masterActive,
      ntpTimezone,
    });
    alert("Pengaturan umum bel berhasil disimpan!");
  };

  const handleZeroTierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      zerotierNetworkId,
      zerotierEnabled,
    });
    fetchZeroTierStatus();
    alert("Konfigurasi ZeroTier VPN berhasil disimpan!");
  };

  const handleMumbleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      mumbleServer,
      mumblePort,
      mumbleUsername,
      mumblePassword,
      mumbleChannel,
      mumbleAutoConnect,
      mumbleMode,
    });
    fetchMumbleStatus();
    alert("Konfigurasi Mumble Audio Streaming berhasil disimpan!");
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      alert("Masukkan password baru.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Password konfirmasi tidak cocok.");
      return;
    }
    onUpdateSettings({ newPassword });
    setNewPassword("");
    setConfirmPassword("");
    alert("Password admin berhasil diubah!");
  };

  const dockerCommand = "curl -sSL https://raw.githubusercontent.com/madrasah/bel-stb/main/install.sh | bash";

  const handleCopyDocker = () => {
    navigator.clipboard.writeText(dockerCommand);
    setCopiedDocker(true);
    setTimeout(() => setCopiedDocker(false), 2000);
  };

  return (
    <div className="space-y-6" id="admin-settings">
      {/* SUB MENU TABS */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-2 shadow-sm flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === "general"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <Settings className="w-4 h-4" />
          Pengaturan Suara & Bel
        </button>

        <button
          onClick={() => setActiveTab("zerotier")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all relative ${
            activeTab === "zerotier"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <Network className="w-4 h-4" />
          ZeroTier VPN Interlokal
          {zerotierStatus?.online && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("mumble")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all relative ${
            activeTab === "mumble"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <Mic className="w-4 h-4" />
          Mumble Audio Streaming
          {mumbleStatus?.connected && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("stb")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === "stb"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <Cpu className="w-4 h-4" />
          NTP Sync & Standalone STB
        </button>
      </div>

      {/* TAB 1: GENERAL SOUND & BELL CONFIGS */}
      {activeTab === "general" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-emerald-500" />
              Parameter Bel & Suara Pengumuman
            </h3>

            <form onSubmit={handleGeneralSubmit} className="space-y-4">
              {/* Master Switch */}
              <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                    Status Siaga Bel Otomatis
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Aktifkan agar bel harian berbunyi tepat waktu secara otomatis.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={masterActive}
                    onChange={(e) => setMasterActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Volume control */}
              <div>
                <div className="flex justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                  <span>Volume Bel & Suara ({Math.round(volume * 100)}%)</span>
                  <Volume2 className="w-4 h-4 text-emerald-500" />
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  className="w-full accent-emerald-600 cursor-pointer h-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Chime type */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                    Jenis Nada Pembuka (Chime)
                  </label>
                  <select
                    className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={chimeType}
                    onChange={(e) => setChimeType(e.target.value as any)}
                  >
                    <option value="airport">Chime Nada Bandara (Pengumuman Bandara)</option>
                    <option value="classic">Dual Ring Digital (Klasik)</option>
                    <option value="none">Tanpa Nada (Langsung Suara)</option>
                  </select>
                </div>

                {/* Language accent */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                    Gaya / Bahasa Pengumuman
                  </label>
                  <select
                    className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    value={voiceLang}
                    onChange={(e) => setVoiceLang(e.target.value as any)}
                  >
                    <option value="siswa_perempuan_semiformal">Siswa Perempuan (Santun)</option>
                    <option value="siswa_laki_semiformal">Siswa Laki-Laki (Formal)</option>
                    <option value="ar-mixed">Bahasa Arab & Indonesia (Campuran)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Voice Speed */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                    Kecepatan Suara ({voiceSpeed}x)
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    className="w-full accent-emerald-600 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg cursor-pointer"
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                  />
                </div>

                {/* Voice Pitch */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                    Nada Suara / Pitch ({voicePitch})
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    className="w-full accent-emerald-600 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg cursor-pointer"
                    value={voicePitch}
                    onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between gap-3">
                <button
                  type="button"
                  onClick={onPreviewBell}
                  className="px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-600/10" />
                  Uji Coba Suara Bel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all"
                >
                  Simpan Pengaturan Suara
                </button>
              </div>
            </form>
          </div>

          {/* SECURE PASSWORD SETTINGS */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 mb-2">
              <KeyRound className="w-5 h-5 text-emerald-500" />
              Keamanan Kata Sandi Admin
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Ubah kata sandi default administrator untuk mencegah perubahan jadwal oleh pihak yang tidak berwenang.
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-zinc-200"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-zinc-200"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-xs font-bold text-white bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition-all shadow-sm"
              >
                Ganti Kata Sandi Admin
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: ZEROTIER VPN INTERLOKAL */}
      {activeTab === "zerotier" && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <Network className="w-5 h-5 text-emerald-500" />
                Koneksi Interlokal ZeroTier VPN
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Menghubungkan bel madrasah ini ke jaringan ZeroTier interlokal agar suara audio bel dapat di-relay lintas gedung/cabang.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchZeroTierStatus}
              disabled={loadingZeroTier}
              className="px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingZeroTier ? "animate-spin" : ""}`} />
              Cek Status VPN
            </button>
          </div>

          {/* STATUS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Status ZeroTier CLI
              </span>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${zerotierStatus?.online ? "bg-emerald-500 animate-ping" : "bg-amber-500"}`}></span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                  {zerotierStatus?.status || "Siap"}
                </span>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                ZeroTier Network ID
              </span>
              <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {zerotierNetworkId || "Belum Diset"}
              </span>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                IP Terdeteksi di ZeroTier
              </span>
              <span className="text-sm font-mono font-bold text-zinc-800 dark:text-zinc-100">
                {zerotierStatus?.assignedIp || "10.147.20.101"}
              </span>
            </div>
          </div>

          {/* FORM SETUP ZEROTIER */}
          <form onSubmit={handleZeroTierSubmit} className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
              <div>
                <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wide">
                  Aktifkan Jaringan ZeroTier VPN
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Otomatis gabung ke jangkauan Network ID interlokal saat STB / server dinyalakan.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={zerotierEnabled}
                  onChange={(e) => setZerotierEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide mb-1.5">
                Network ID ZeroTier (16 Karakter Heksadesimal)
              </label>
              <input
                type="text"
                required
                placeholder="contoh: 8056c2e21c000001"
                className="w-full px-4 py-2.5 font-mono text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-zinc-200"
                value={zerotierNetworkId}
                onChange={(e) => setZerotierNetworkId(e.target.value)}
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                Masukkan 16-digit Network ID dari dashboard Central ZeroTier Anda.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <Network className="w-4 h-4" />
                Simpan & Gabung Jaringan VPN
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: MUMBLE AUDIO STREAMING */}
      {activeTab === "mumble" && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <Mic className="w-5 h-5 text-emerald-500" />
                Integrasi Mumble Audio Client
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Mengirimkan sinyal suara & pengumuman bel secara langsung ke Mic input Mumble Server untuk disiarkan ke pengeras suara cabang.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchMumbleStatus}
              disabled={loadingMumble}
              className="px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingMumble ? "animate-spin" : ""}`} />
              Cek Status Mumble
            </button>
          </div>

          {/* STATUS DISPLAY */}
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${mumbleStatus?.connected ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-500"}`}>
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {mumbleStatus?.connected ? "Mumble Audio Live Broadcast Aktif" : "Mumble Streaming Nonaktif"}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {mumbleStatus?.message || "Suara bel siap diteruskan ke input mic server Mumble."}
                </p>
              </div>
            </div>

            <span className={`px-3 py-1 text-xs font-bold rounded-full ${mumbleStatus?.connected ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" : "bg-zinc-100 text-zinc-600"}`}>
              {mumbleStatus?.connected ? "TERHUBUNG" : "TERPUTUS"}
            </span>
          </div>

          {/* FORM SETUP MUMBLE */}
          <form onSubmit={handleMumbleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide mb-1.5">
                  Mode Koneksi IP Server
                </label>
                <select
                  className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-zinc-200"
                  value={mumbleMode}
                  onChange={(e) => setMumbleMode(e.target.value as any)}
                >
                  <option value="zerotier">Via Jaringan ZeroTier IP (Interlokal)</option>
                  <option value="local">Via IP Lokal LAN (Tanpa ZeroTier)</option>
                  <option value="disabled">Nonaktifkan Streaming Mumble</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide mb-1.5">
                  Host IP Server Mumble / Murmur
                </label>
                <input
                  type="text"
                  required
                  placeholder="contoh: 10.147.18.100 atau 192.168.1.100"
                  className="w-full px-4 py-2.5 font-mono text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-zinc-200"
                  value={mumbleServer}
                  onChange={(e) => setMumbleServer(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide mb-1.5">
                  Port Server Mumble
                </label>
                <input
                  type="number"
                  required
                  className="w-full px-4 py-2.5 font-mono text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-zinc-200"
                  value={mumblePort}
                  onChange={(e) => setMumblePort(parseInt(e.target.value) || 64738)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide mb-1.5">
                  Nama Client Bot Audio
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-zinc-200"
                  value={mumbleUsername}
                  onChange={(e) => setMumbleUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide mb-1.5">
                  Nama Channel Suara
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-zinc-200"
                  value={mumbleChannel}
                  onChange={(e) => setMumbleChannel(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                Simpan Konfigurasi Mumble
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: NTP TIME & STANDALONE STB DOCKER */}
      {activeTab === "stb" && (
        <div className="space-y-6">
          {/* NTP TIME SETTINGS */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 mb-2">
              <Radio className="w-5 h-5 text-emerald-500" />
              Integrasi Jam Presisi NTP Server
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Aplikasi secara otomatis mensinkronkan jam internal dengan pool NTP Indonesia untuk menjamin akurasi jadwal bel.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Pilih Opsi Zona Waktu (NTP Sync)
                </label>
                <select
                  className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  value={ntpTimezone}
                  onChange={(e) => setNtpTimezone(e.target.value as any)}
                >
                  <option value="WIB">WIB (Waktu Indonesia Barat - UTC+7)</option>
                  <option value="WITA">WITA (Waktu Indonesia Tengah - UTC+8)</option>
                  <option value="WIT">WIT (Waktu Indonesia Timur - UTC+9)</option>
                </select>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-xs">
                <span className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Pool Server NTP Terhubung:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                  <li>0.id.pool.ntp.org</li>
                  <li>1.id.pool.ntp.org</li>
                  <li>2.id.pool.ntp.org</li>
                </ul>
              </div>
            </div>
          </div>

          {/* DOCKER & STB DEPLOYMENT GUIDE */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-500" />
              Paket Standalone STB (1-Klik Docker Deployment)
            </h3>
            <p className="text-xs text-zinc-400">
              Aplikasi ini disiapkan lengkap dengan `Dockerfile`, `docker-compose.yml`, ZeroTier One, PulseAudio loopback, dan Mumble Client siap pakai di STB (Armbian/Debian/Ubuntu).
            </p>

            <div className="bg-zinc-900 text-zinc-100 rounded-2xl p-4 font-mono text-xs space-y-2 border border-zinc-800">
              <div className="flex justify-between items-center text-zinc-400 text-[10px] pb-2 border-b border-zinc-800">
                <span>Perintah Instalasi STB (Terminal Linux):</span>
                <button
                  type="button"
                  onClick={handleCopyDocker}
                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-emerald-400 font-sans flex items-center gap-1 transition-colors"
                >
                  {copiedDocker ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedDocker ? "Tersalin!" : "Salin Perintah"}
                </button>
              </div>
              <code className="block text-emerald-400 break-all select-all">
                docker-compose up -d --build
              </code>
            </div>

            <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-emerald-900 dark:text-emerald-300">
                Keunggulan Standalone STB:
              </p>
              <ul className="list-disc pl-4 text-zinc-600 dark:text-zinc-400 space-y-0.5 text-[11px]">
                <li>Otomatis jalan saat STB dihidupkan (Auto-restart Docker daemon).</li>
                <li>Mencakup ZeroTier VPN & Mumble Audio Streamer dalam 1 container tanpa perlu setting terpisah.</li>
                <li>Output audio berbunyi ke speaker fisik STB sekaligus di-relay ke jaringan Mumble.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

