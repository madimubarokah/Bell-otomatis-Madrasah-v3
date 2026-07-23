# Dockerfile untuk Bel Madrasah Standalone STB / Linux Server
FROM node:20-slim

# Install system dependencies: PulseAudio, ALSA, ZeroTier, espeak TTS, mpg123, & Mumble tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    procps \
    pulseaudio \
    pulseaudio-utils \
    alsa-utils \
    espeak \
    mpg123 | true \
    mumble-server \
    mumble \
    && rm -rf /var/lib/apt/lists/*

# Install ZeroTier One CLI
RUN curl -s https://install.zerotier.com | bash || true

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Build Vite frontend and compile server
RUN npm run build

# Expose Web Port (2008 / 3000) and ZeroTier UDP
EXPOSE 2008
EXPOSE 3000
EXPOSE 9993/udp

# Set environment variables
ENV NODE_ENV=production
ENV PORT=2008

# Make entrypoint script executable
RUN chmod +x /app/entrypoint.sh || true

ENTRYPOINT ["/bin/bash", "/app/entrypoint.sh"]
