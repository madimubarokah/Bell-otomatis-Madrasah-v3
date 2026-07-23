// Custom Synthesizer and Speech Engine using Web Audio API and Web Speech API
// This operates completely client-side in the browser, bypassing server audio card needs!

import { BellSettings } from "../types";

// Helper to get ordinal Arabic words for school periods (Pelajaran ke-X)
export function getArabicPeriodWord(period: number): string {
  const arabicOrdinalPeriods: Record<number, string> = {
    1: "الأولى",
    2: "الثانية",
    3: "الثالثة",
    4: "الرابعة",
    5: "الخامسة",
    6: "السادسة",
    7: "السابعة",
    8: "الثامنة",
    9: "التاسعة",
    10: "العاشرة",
  };
  return arabicOrdinalPeriods[period] || period.toString();
}

// Helper to synthesize a premium, warm Airport Announcement Chime
// Uses FM synthesis-like decay & multiple harmonics for a lush, loud, and unhurried sound
export function playAirportChime(audioCtx: AudioContext, masterVolume: number): Promise<void> {
  return new Promise((resolve) => {
    const destination = audioCtx.destination;

    // Harmonic frequencies for classic airport announcement: F4, A4, C5, F5
    const notes = [349.23, 440.00, 523.25, 698.46];
    const duration = 1.6; // Longer decay duration so notes ring out resonant & clear ("lama")
    const spacing = 0.45; // Unhurried spacing between notes ("jarak tidak terlalu cepat")

    // Dynamics compressor for loud, clear, crisp audio dynamics without distortion
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
    compressor.knee.setValueAtTime(8, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(8, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.3, audioCtx.currentTime);
    compressor.connect(destination);

    // Master gain set for louder output ("lebih lantang")
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(masterVolume * 0.85, audioCtx.currentTime);
    masterGain.connect(compressor);

    notes.forEach((freq, index) => {
      const startTime = audioCtx.currentTime + index * spacing;

      // Primary sine oscillator (fundamental tone)
      const osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      // Overtone oscillator (1 octave higher) for authentic tubular bell clarity
      const overtoneOsc = audioCtx.createOscillator();
      overtoneOsc.type = "sine";
      overtoneOsc.frequency.setValueAtTime(freq * 2, startTime);

      // Sub-harmonic oscillator (1 octave lower) for warm body
      const subOsc = audioCtx.createOscillator();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(freq / 2, startTime);

      // Gain envelope for fundamental tone
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.9, startTime + 0.05); // Attack
      gainNode.gain.exponentialRampToValueAtTime(0.0008, startTime + duration); // Long exponential decay

      // Gain envelope for overtone
      const overtoneGainNode = audioCtx.createGain();
      overtoneGainNode.gain.setValueAtTime(0, startTime);
      overtoneGainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
      overtoneGainNode.gain.exponentialRampToValueAtTime(0.0008, startTime + (duration * 0.7));

      // Gain envelope for sub-harmonic
      const subGainNode = audioCtx.createGain();
      subGainNode.gain.setValueAtTime(0, startTime);
      subGainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      subGainNode.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

      osc.connect(gainNode);
      overtoneOsc.connect(overtoneGainNode);
      subOsc.connect(subGainNode);

      gainNode.connect(masterGain);
      overtoneGainNode.connect(masterGain);
      subGainNode.connect(masterGain);

      osc.start(startTime);
      overtoneOsc.start(startTime);
      subOsc.start(startTime);

      osc.stop(startTime + duration + 0.1);
      overtoneOsc.stop(startTime + duration + 0.1);
      subOsc.stop(startTime + duration + 0.1);
    });

    const totalChimeTime = (notes.length * spacing + duration) * 1000;
    setTimeout(() => {
      resolve();
    }, totalChimeTime);
  });
}

// Helper to synthesize a classic digital dual-beep
export function playClassicBeep(audioCtx: AudioContext, masterVolume: number): Promise<void> {
  return new Promise((resolve) => {
    const destination = audioCtx.destination;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    // Standard school dual frequency ring
    osc1.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc2.frequency.setValueAtTime(440, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(masterVolume * 0.3, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(destination);

    osc1.start();
    osc2.start();

    osc1.stop(audioCtx.currentTime + 1.3);
    osc2.stop(audioCtx.currentTime + 1.3);

    setTimeout(() => {
      resolve();
    }, 1300);
  });
}

// Play closing chime: matching descending airport announcement chime (F5, C5, A4, F4)
export function playClosingChime(audioCtx: AudioContext, masterVolume: number): Promise<void> {
  return new Promise((resolve) => {
    const destination = audioCtx.destination;

    // Descending harmonic frequencies for airport announcement closing cadence: F5, C5, A4, F4
    const notes = [698.46, 523.25, 440.00, 349.23];
    const duration = 1.6; // Longer decay duration matching opening chime
    const spacing = 0.45; // Unhurried spacing between notes matching opening chime

    // Dynamics compressor for loud, clear, crisp audio dynamics without distortion
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
    compressor.knee.setValueAtTime(8, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(8, audioCtx.currentTime);
    compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
    compressor.release.setValueAtTime(0.3, audioCtx.currentTime);
    compressor.connect(destination);

    // Master gain set for loud output matching opening chime
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(masterVolume * 0.85, audioCtx.currentTime);
    masterGain.connect(compressor);

    notes.forEach((freq, index) => {
      const startTime = audioCtx.currentTime + index * spacing;

      // Primary sine oscillator (fundamental tone)
      const osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      // Overtone oscillator (1 octave higher) for authentic tubular bell clarity
      const overtoneOsc = audioCtx.createOscillator();
      overtoneOsc.type = "sine";
      overtoneOsc.frequency.setValueAtTime(freq * 2, startTime);

      // Sub-harmonic oscillator (1 octave lower) for warm body
      const subOsc = audioCtx.createOscillator();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(freq / 2, startTime);

      // Gain envelope for fundamental tone
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.9, startTime + 0.05); // Attack
      gainNode.gain.exponentialRampToValueAtTime(0.0008, startTime + duration); // Long exponential decay

      // Gain envelope for overtone
      const overtoneGainNode = audioCtx.createGain();
      overtoneGainNode.gain.setValueAtTime(0, startTime);
      overtoneGainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
      overtoneGainNode.gain.exponentialRampToValueAtTime(0.0008, startTime + (duration * 0.7));

      // Gain envelope for sub-harmonic
      const subGainNode = audioCtx.createGain();
      subGainNode.gain.setValueAtTime(0, startTime);
      subGainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      subGainNode.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

      osc.connect(gainNode);
      overtoneOsc.connect(overtoneGainNode);
      subOsc.connect(subGainNode);

      gainNode.connect(masterGain);
      overtoneGainNode.connect(masterGain);
      subGainNode.connect(masterGain);

      osc.start(startTime);
      overtoneOsc.start(startTime);
      subOsc.start(startTime);

      osc.stop(startTime + duration + 0.1);
      overtoneOsc.stop(startTime + duration + 0.1);
      subOsc.stop(startTime + duration + 0.1);
    });

    const totalTime = (notes.length * spacing + duration) * 1000;
    setTimeout(() => {
      resolve();
    }, totalTime);
  });
}

function getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    const onVoicesChanged = () => {
      voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        window.speechSynthesis.onvoiceschanged = null;
        resolve(voices);
      }
    };
    window.speechSynthesis.onvoiceschanged = onVoicesChanged;
    setTimeout(() => {
      if (window.speechSynthesis.onvoiceschanged === onVoicesChanged) {
        window.speechSynthesis.onvoiceschanged = null;
      }
      resolve(window.speechSynthesis.getVoices());
    }, 600);
  });
}

// Speak the announcement text using Web Speech API Synthesis with unhurried pauses
export function speakAnnouncement(
  text: string,
  settings: BellSettings,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  return new Promise(async (resolve) => {
    if (!window.speechSynthesis) {
      console.warn("Browser tidak mendukung SpeechSynthesis.");
      resolve();
      return;
    }

    // Cancel any active speech to avoid queuing delays
    window.speechSynthesis.cancel();

    // Split text by sentence to introduce beautiful natural pauses
    const segments = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (segments.length === 0) {
      resolve();
      return;
    }

    if (onStart) onStart();

    // Select Voice asynchronously to ensure they are loaded
    const voices = await getVoicesAsync();
    let selectedVoice: SpeechSynthesisVoice | null = null;

    const voiceLangStr = String(settings.voiceLang || "");
    const isMale = voiceLangStr.includes("laki");
    const isFemale = voiceLangStr.includes("perempuan");
    const isFormal = voiceLangStr.includes("formal");

    // Indonesian-First accent: always try to get Indonesian voice to pronounce Arabic with Indonesian-Muslim tone
    const indonesianVoices = voices.filter((v) => 
      v.lang.startsWith("id") || 
      v.lang.startsWith("id-") || 
      v.lang.startsWith("id_") ||
      v.lang.startsWith("ms")
    );

    let detectedGenderOfVoice: "male" | "female" | "unknown" = "unknown";

    if (isMale) {
      // Find Indonesian male voice
      selectedVoice = indonesianVoices.find((v) => 
        v.name.toLowerCase().includes("ardi") || 
        v.name.toLowerCase().includes("andika") || 
        v.name.toLowerCase().includes("wira") ||
        v.name.toLowerCase().includes("male")
      ) || null;
      
      if (selectedVoice) {
        detectedGenderOfVoice = "male";
      } else {
        selectedVoice = indonesianVoices[0] || null;
        if (selectedVoice) {
          const nameLower = selectedVoice.name.toLowerCase();
          if (nameLower.includes("gadis") || nameLower.includes("zira") || nameLower.includes("damayanti") || nameLower.includes("novi") || nameLower.includes("yasmin") || nameLower.includes("female") || nameLower.includes("google")) {
            detectedGenderOfVoice = "female";
          } else {
            detectedGenderOfVoice = "male";
          }
        }
      }
    } else {
      // Find Indonesian female voice
      selectedVoice = indonesianVoices.find((v) => 
        v.name.toLowerCase().includes("gadis") || 
        v.name.toLowerCase().includes("zira") || 
        v.name.toLowerCase().includes("damayanti") || 
        v.name.toLowerCase().includes("novi") || 
        v.name.toLowerCase().includes("yasmin") || 
        v.name.toLowerCase().includes("female") || 
        v.name.toLowerCase().includes("google")
      ) || null;

      if (selectedVoice) {
        detectedGenderOfVoice = "female";
      } else {
        selectedVoice = indonesianVoices[0] || null;
        if (selectedVoice) {
          const nameLower = selectedVoice.name.toLowerCase();
          if (nameLower.includes("ardi") || nameLower.includes("andika") || nameLower.includes("wira") || nameLower.includes("male")) {
            detectedGenderOfVoice = "male";
          } else {
            detectedGenderOfVoice = "female";
          }
        }
      }
    }

    // Ultimate fallback if no Indonesian voice found
    if (!selectedVoice) {
      if (isMale) {
        selectedVoice = voices.find((v) => v.name.toLowerCase().includes("david") || v.name.toLowerCase().includes("male")) || voices[0] || null;
        detectedGenderOfVoice = "male";
      } else {
        selectedVoice = voices.find((v) => v.name.toLowerCase().includes("zira") || v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("google")) || voices[0] || null;
        detectedGenderOfVoice = "female";
      }
    }

    // Advanced Pitch and Rate modulation for realistic simulated human sound
    let pitch = settings.voicePitch || 1.0;
    let rate = settings.voiceSpeed || 0.95;

    // Standard rate for realistic pacing (not too fast/robotic)
    if (isFormal) {
      rate = 0.88; // respectful, clear, slow paced
    } else {
      rate = 0.95; // slightly more conversational teen pacing
    }

    if (isMale) {
      if (detectedGenderOfVoice === "female") {
        // Synthesize male voice from female fallback with deep pitch shifting
        pitch = 0.68;
      } else {
        // Natural male pitch
        pitch = 0.88;
      }
    } else {
      if (detectedGenderOfVoice === "male") {
        // Synthesize female voice from male fallback with high pitch shifting
        pitch = 1.38;
      } else {
        // Natural female pitch
        pitch = 1.05;
      }
    }

    // Speak each segment with a natural unhurried timeout between them
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      await new Promise<void>((resolveSegment) => {
        const utterance = new SpeechSynthesisUtterance(segment);
        utterance.volume = settings.volume;
        utterance.rate = rate;
        utterance.pitch = pitch;

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.onend = () => {
          resolveSegment();
        };

        utterance.onerror = (e) => {
          console.warn("Segment Speech Warning (expected in sandboxed/headless tests):", e.error || e);
          resolveSegment();
        };

        window.speechSynthesis.speak(utterance);
      });

      // Pause between segments - e.g. 1.2 seconds for formal, 0.9 seconds for semi-formal
      if (i < segments.length - 1) {
        const pauseDuration = isFormal ? 1200 : 900;
        await new Promise((r) => setTimeout(r, pauseDuration));
      }
    }

    if (onEnd) onEnd();
    resolve();
  });
}

// Complete Full Bell Cycle: Opening Chime -> Vocal Announcement -> Closing Chime
export async function triggerFullSchoolBell(
  title: string,
  type: "class" | "break" | "custom",
  period: number | undefined,
  customText: string | undefined,
  settings: BellSettings,
  onVoiceStart?: () => void,
  onFinished?: () => void
): Promise<void> {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // 1. Play Opening Chime
    if (settings.chimeType === "airport") {
      await playAirportChime(audioCtx, settings.volume);
    } else if (settings.chimeType === "classic") {
      await playClassicBeep(audioCtx, settings.volume);
    }

    // Give a nice spacing before speaking (more unhurried)
    await new Promise((r) => setTimeout(r, 600));

    // 2. Generate spoken text
    let announcementText = "";

    if (customText) {
      announcementText = customText;
    } else {
      const arabicPeriod = period ? getArabicPeriodWord(period) : "";

      if (settings.voiceLang === "ar") {
        // Full Arabic announcement
        if (type === "class" && period) {
          announcementText = `أهلاً وسهلاً. لقد حان وقت الحصة ${arabicPeriod} الآن. شكراً لكم.`;
        } else if (type === "break") {
          announcementText = `أهلاً وسهلاً. حan وقت الاستراحة الآن. استمتعوا بوقتكم. شكراً لكم.`;
        } else {
          announcementText = `أهلاً وسهلاً. تنبيه للمدرسين والطلاب. شكراً لكم.`;
        }
      } else if (settings.voiceLang === "id") {
        // Full Indonesian announcement
        if (type === "class" && period) {
          announcementText = `Selamat datang. Saatnya masuk jam pelajaran ke ${period} dimulai sekarang. Terima kasih.`;
        } else if (type === "break") {
          announcementText = `Selamat datang. Saatnya istirahat dimulai sekarang. Selamat menikmati waktu istirahat Anda. Terima kasih.`;
        } else {
          announcementText = `Selamat datang. Perhatian untuk seluruh civitas akademika madrasah. Terima kasih.`;
        }
      } else {
        // Default / student voices / ar-mixed: Ahlan + Indonesian content + Syukron with beautiful spacing
        if (type === "class" && period) {
          announcementText = `Ahlan wa sahlan. Saatnya masuk jam pelajaran ke ${period} dimulai sekarang. Syukron.`;
        } else if (type === "break") {
          announcementText = `Ahlan wa sahlan. Saatnya istirahat dimulai sekarang. Selamat menikmati waktu istirahat Anda. Syukron.`;
        } else {
          announcementText = `Ahlan wa sahlan. Perhatian untuk seluruh civitas akademika madrasah. Syukron.`;
        }
      }
    }

    // Play Voice Announcement
    await speakAnnouncement(announcementText, settings, onVoiceStart);

    await new Promise((r) => setTimeout(r, 600));

    // 3. Play Closing Chime
    if (settings.chimeType !== "none") {
      await playClosingChime(audioCtx, settings.volume);
    }

    audioCtx.close();
    if (onFinished) onFinished();
  } catch (err) {
    console.warn("Gagal memutar bel otomatis:", err);
    if (onFinished) onFinished();
  }
}
