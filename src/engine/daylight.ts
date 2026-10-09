import { TICK_SECONDS } from "./catalog";

/** Nauvis day length: 25,000 Factorio ticks. */
const DAY_SECONDS = 25000 / 60;

/**
 * Nauvis day phases as fractions of the day, starting at noon. Solar output is full in the
 * day, fades out between dusk and evening, is zero until morning and fades back in until dawn.
 */
const DUSK = 0.25;
const EVENING = 0.45;
const MORNING = 0.55;
const DAWN = 0.75;

/** Position in the day/night cycle, 0..1 with 0 = noon. The game starts at noon, as in Factorio. */
const dayTime = (tick: number) => ((tick * TICK_SECONDS) / DAY_SECONDS) % 1;

/** Solar output multiplier (0..1) at a time of day. Averages 70% over a full day. */
const daylight = (time: number) => {
  if (time < DUSK || time >= DAWN) return 1;
  if (time < EVENING) return (EVENING - time) / (EVENING - DUSK);
  if (time < MORNING) return 0;
  return (time - MORNING) / (DAWN - MORNING);
};

export { DAWN, DAY_SECONDS, dayTime, daylight, DUSK, EVENING, MORNING };
