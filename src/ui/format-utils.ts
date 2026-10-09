import { RESOURCES } from "../engine/catalog";
import type { ResourceId } from "../engine/catalog";

const SUFFIXES = ["", "k", "M", "G", "T"];

/** Compact number: 999, 1.2k, 34.5M. Whole numbers below 1000 unless `decimals` is given. */
const formatAmount = (value: number, decimals = 0) => {
  let n = value;
  let tier = 0;
  while (Math.abs(n) >= 1000 && tier < SUFFIXES.length - 1) {
    n /= 1000;
    tier++;
  }
  const digits = tier > 0 ? (Math.abs(n) < 100 ? 1 : 0) : decimals;
  const rounded = tier > 0 || decimals > 0 ? n.toFixed(digits) : Math.floor(n).toString();
  return `${rounded}${SUFFIXES[tier]}`;
};

/** Power from kW: 450 kW, 1.8 MW. */
const formatPower = (kw: number) => {
  if (Math.abs(kw) >= 1000) return `${formatAmount(kw / 1000, 2)} MW`;
  return `${formatAmount(kw, kw > 0 && kw < 10 ? 1 : 0)} kW`;
};

const formatRateValue = (perSecond: number) => {
  const abs = Math.abs(perSecond);
  if (abs < 5e-4) return "0";
  return formatAmount(perSecond, abs < 1 ? 3 : abs < 10 ? 2 : 1);
};

/** A per-second rate in the resource's own unit, e.g. "0.25/s" or "900 kW". */
const formatRate = (id: ResourceId, perSecond: number, signed = false) => {
  const sign = signed && perSecond > 0 ? "+" : "";
  if (id === "electricity") return `${sign}${formatPower(perSecond)}`;
  return `${sign}${formatRateValue(perSecond)}/s`;
};

/** "0.13 / 0.250/s": actual and potential sharing one unit. */
const formatRatePair = (id: ResourceId, actual: number, potential: number) =>
  id === "electricity" ? `${formatPower(actual)} / ${formatPower(potential)}` : `${formatRateValue(actual)} / ${formatRate(id, potential)}`;

const formatPercent = (fraction: number) => `${Math.round(fraction * 100)}%`;

const formatSeconds = (seconds: number) => `${Number(seconds.toFixed(1))}s`;

/** Energy from kJ: 900 kJ, 1.8 MJ, 3.2 GJ. */
const formatEnergy = (kj: number) => {
  const units = ["kJ", "MJ", "GJ", "TJ"];
  let n = kj;
  let tier = 0;
  while (Math.abs(n) >= 1000 && tier < units.length - 1) {
    n /= 1000;
    tier++;
  }
  return `${formatAmount(n, tier > 0 || n % 1 ? 1 : 0)} ${units[tier]}`;
};

/** An absolute amount in the resource's unit: items as counts, electricity as energy. */
const formatQuantity = (id: ResourceId, amount: number) => {
  if (id === "electricity") return formatEnergy(amount);
  // Small fractional amounts (e.g. chart ticks 0.2, 0.4…) keep one decimal instead of all reading "0".
  return formatAmount(amount, Math.abs(amount) < 10 && amount % 1 !== 0 ? 1 : 0);
};

/** "45s", "10m 2s", "1h 5m". */
const formatDuration = (seconds: number) => {
  const s = Math.ceil(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
};

const resourceName = (id: ResourceId) => RESOURCES[id].name;

export { formatAmount, formatDuration, formatEnergy, formatPercent, formatQuantity, formatPower, formatRate, formatRatePair, formatSeconds, resourceName };
