#!/bin/bash
echo "========================================================="
echo "       MEMULAI SYSTEM BEL MADRASAH AUTOMATIC STB         "
echo "========================================================="

# Start PulseAudio daemon for virtual mic audio routing to Mumble
pulseaudio --start --exit-idle-time=-1 || true

# Start ZeroTier One service if installed
if command -v zerotier-one &> /dev/null; then
    echo "[STB] Memulai layanan ZeroTier One..."
    zerotier-one -d || true
fi

# Start Node.js Bel Server
echo "[STB] Memulai Bel Madrasah App pada port ${PORT:-2008}..."
exec npm start
