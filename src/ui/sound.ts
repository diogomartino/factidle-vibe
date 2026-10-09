type SoundId = "craft" | "research" | "warning" | "error" | "launch" | "destroyed";

interface Note {
  frequency: number;
  /** Seconds after the sound starts. */
  at: number;
  duration: number;
}

interface SoundDef {
  wave: OscillatorType;
  volume: number;
  /** Repeats closer than this are dropped, so bursts (e.g. Build 10) stay pleasant. */
  minGapMs: number;
  notes: Note[];
}

const SOUNDS: Record<SoundId, SoundDef> = {
  // Soft rising blip: a craft or build finished.
  craft: { wave: "triangle", volume: 0.05, minGapMs: 150, notes: [{ frequency: 660, at: 0, duration: 0.06 }, { frequency: 990, at: 0.05, duration: 0.08 }] },
  // C major arpeggio: research finished, new content unlocked.
  research: {
    wave: "sine",
    volume: 0.07,
    minGapMs: 500,
    notes: [523.25, 659.25, 783.99, 1046.5].map((frequency, i) => ({ frequency, at: i * 0.09, duration: 0.18 })),
  },
  // Two low beeps: something needs attention (e.g. power shortage started).
  warning: { wave: "square", volume: 0.025, minGapMs: 20_000, notes: [{ frequency: 330, at: 0, duration: 0.12 }, { frequency: 330, at: 0.2, duration: 0.12 }] },
  // Long rising sweep: a rocket launched.
  launch: {
    wave: "sawtooth",
    volume: 0.03,
    minGapMs: 2000,
    notes: [110, 147, 196, 262, 349, 466, 622, 831].map((frequency, i) => ({ frequency, at: i * 0.12, duration: 0.2 })),
  },
  // Low crunch: biters destroyed a building.
  destroyed: {
    wave: "sawtooth",
    volume: 0.04,
    minGapMs: 1500,
    notes: [{ frequency: 110, at: 0, duration: 0.18 }, { frequency: 73, at: 0.12, duration: 0.3 }],
  },
  // Falling pair: an action failed.
  error: { wave: "square", volume: 0.03, minGapMs: 300, notes: [{ frequency: 311, at: 0, duration: 0.1 }, { frequency: 233, at: 0.1, duration: 0.18 }] },
};

let context: AudioContext | null = null;
const lastPlayed = new Map<SoundId, number>();

/** Synthesized with Web Audio (no asset files). Silently does nothing where audio is unavailable. */
const playSound = (id: SoundId) => {
  const sound = SOUNDS[id];
  const now = performance.now();
  if (now - (lastPlayed.get(id) ?? -Infinity) < sound.minGapMs) return;
  lastPlayed.set(id, now);
  try {
    context ??= new AudioContext();
    // Browsers start audio suspended until the first user gesture; later plays resume it.
    void context.resume();
  } catch {
    return;
  }
  const start = context.currentTime;
  for (const note of sound.notes) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const begin = start + note.at;
    oscillator.type = sound.wave;
    oscillator.frequency.value = note.frequency;
    gain.gain.setValueAtTime(0, begin);
    gain.gain.linearRampToValueAtTime(sound.volume, begin + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, begin + note.duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(begin);
    oscillator.stop(begin + note.duration + 0.02);
  }
};

const MUTED_KEY = "factidle-muted";

/** Per-browser preference, not part of the save. */
const loadMuted = () => {
  try {
    return localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
};

const saveMuted = (muted: boolean) => {
  try {
    localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
  } catch {
    // Storage unavailable: the preference lasts for this session only.
  }
};

export { loadMuted, playSound, saveMuted };
export type { SoundId };
