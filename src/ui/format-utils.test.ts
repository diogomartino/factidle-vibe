import { describe, expect, it } from "vitest";
import { formatAmount, formatDuration, formatPower, formatQuantity, formatRate } from "./format-utils";

describe("formatting", () => {
  it("formats amounts compactly", () => {
    expect(formatAmount(999.9)).toBe("999");
    expect(formatAmount(1234)).toBe("1.2k");
    expect(formatAmount(345_678)).toBe("346k");
    expect(formatAmount(2_500_000)).toBe("2.5M");
  });

  it("formats absolute quantities", () => {
    expect(formatQuantity("iron-plate", 1234)).toBe("1.2k");
    expect(formatQuantity("iron-plate", 0.4)).toBe("0.4");
    expect(formatQuantity("iron-plate", 57)).toBe("57");
    expect(formatQuantity("electricity", 900)).toBe("900 kJ");
    expect(formatQuantity("electricity", 54_000)).toBe("54.0 MJ");
  });

  it("formats durations", () => {
    expect(formatDuration(44.2)).toBe("45s");
    expect(formatDuration(602)).toBe("10m 2s");
    expect(formatDuration(3900)).toBe("1h 5m");
  });

  it("formats rates and power", () => {
    expect(formatRate("iron-ore", 0.25)).toBe("0.250/s");
    expect(formatRate("coal", 1.5, true)).toBe("+1.50/s");
    expect(formatPower(900)).toBe("900 kW");
    expect(formatPower(1800)).toBe("1.80 MW");
  });
});
