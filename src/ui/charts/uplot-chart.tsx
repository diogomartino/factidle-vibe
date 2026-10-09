import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

interface UPlotChartProps {
  /** Must be memoized: a new object recreates the chart. */
  options: Omit<uPlot.Options, "width" | "height">;
  data: uPlot.AlignedData;
  height: number;
  className?: string;
}

/** Thin React wrapper: creates the plot once per options, streams data, follows container width. */
const UPlotChart = ({ options, data, height, className = "" }: UPlotChartProps) => {
  const container = useRef<HTMLDivElement>(null);
  const plot = useRef<uPlot | null>(null);
  const latest = useRef(data);

  // Declared first so a (re)created plot below starts from the newest data.
  useEffect(() => {
    latest.current = data;
    plot.current?.setData(data);
  }, [data]);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const chart = new uPlot({ ...options, width: el.clientWidth, height }, latest.current, el);
    plot.current = chart;
    const observer = new ResizeObserver(() => chart.setSize({ width: el.clientWidth, height }));
    observer.observe(el);
    return () => {
      observer.disconnect();
      chart.destroy();
      plot.current = null;
    };
  }, [options, height]);

  return <div ref={container} className={`w-full ${className}`} />;
};

export { UPlotChart };
