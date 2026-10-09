import type uPlot from "uplot";

/** The validated 8-slot categorical palette (dark mode), assigned in fixed order. */
const CATEGORICAL_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
/** Produced vs consumed for a single resource: categorical slots 1 and 2. */
const SERIES_COLORS = { produced: CATEGORICAL_COLORS[0]!, consumed: CATEGORICAL_COLORS[1]! };
const AXIS_COLOR = "#8b8b94";
const GRID_COLOR = "#2c2c31";
const MUTED_LINE = "#8b8b94";

const axis = (overrides: uPlot.Axis = {}): uPlot.Axis => ({
  stroke: AXIS_COLOR,
  grid: { stroke: GRID_COLOR, width: 1 },
  ticks: { stroke: GRID_COLOR, width: 1, size: 4 },
  font: "11px ui-monospace, monospace",
  ...overrides,
});

/** Rates never go negative; pad the top so lines don't hug the frame. */
const zeroBasedRange: uPlot.Range.Function = (_u, _min, max) => [0, max > 0 ? max * 1.1 : 1];

export { axis, AXIS_COLOR, CATEGORICAL_COLORS, GRID_COLOR, MUTED_LINE, SERIES_COLORS, zeroBasedRange };
