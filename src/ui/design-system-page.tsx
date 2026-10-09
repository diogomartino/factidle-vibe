import { ArrowLeft, Download, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type uPlot from "uplot";
import { RESOURCE_IDS, RESOURCES } from "../engine/catalog";
import type { ResourceId } from "../engine/catalog";
import { axis, MUTED_LINE, SERIES_COLORS, zeroBasedRange } from "./charts/chart-theme";
import { UPlotChart } from "./charts/uplot-chart";
import { Button, IconButton } from "./design/button";
import { Chip } from "./design/chip";
import type { Tone } from "./design/chip";
import { CollapsibleSection } from "./design/collapsible-section";
import { ConfirmDialog, Dialog } from "./design/dialog";
import { Input } from "./design/input";
import { Menu } from "./design/menu";
import { EmptyState, Panel } from "./design/panel";
import { Popover } from "./design/popover";
import { ProgressBar } from "./design/progress-bar";
import { ResourceIcon } from "./design/resource-icon";
import { ScrollArea } from "./design/scroll-area";
import { SegmentedControl } from "./design/segmented-control";
import { Select } from "./design/select";
import { Separator } from "./design/separator";
import { Slider } from "./design/slider";
import { Stepper } from "./design/stepper";
import { Switch } from "./design/switch";
import { TabPanel, Tabs } from "./design/tabs";
import { Toast, ToastViewport } from "./design/toast";
import { Tooltip } from "./design/tooltip";
import { formatAgo } from "./stats-utils";

const COLOR_TOKENS = ["bg", "panel", "raised", "line", "line-strong", "text", "muted", "accent", "good", "warn", "bad"];
const TONES: Tone[] = ["neutral", "strong", "good", "warn", "bad"];
const OPTIONS = (["iron-plate", "copper-plate", "steel-plate", "stone-brick"] as const).map((id) => ({ value: id, label: RESOURCES[id].name, icon: id }));

/** Deterministic demo series for the chart examples. */
const demoData = (): [number[], number[], number[]] => {
  const x = Array.from({ length: 120 }, (_, i) => (i - 119) * 5);
  return [x, x.map((_, i) => 4 + Math.sin(i / 8) * 1.5), x.map((_, i) => 3.5 + Math.cos(i / 11))];
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <Panel aria-labelledby={`ds-${title}`}>
    <h2 id={`ds-${title}`} className="mb-3 text-sm font-semibold">
      {title}
    </h2>
    <div className="flex flex-wrap items-center gap-3">{children}</div>
  </Panel>
);

const DesignSystemPage = () => {
  const [select, setSelect] = useState<ResourceId>("iron-plate");
  const [segment, setSegment] = useState("10m");
  const [on, setOn] = useState(true);
  const [slider, setSlider] = useState(60);
  const [stepper, setStepper] = useState(2);
  const [tab, setTab] = useState("one");
  const [dialog, setDialog] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [toasts, setToasts] = useState<number[]>([]);
  const data = useMemo(() => demoData(), []);
  const chartOptions = useMemo(
    (): Omit<uPlot.Options, "width" | "height"> => ({
      scales: { x: { time: false }, y: { range: zeroBasedRange } },
      cursor: { drag: { x: false, y: false } },
      axes: [axis({ values: (_u, t) => t.map(formatAgo) }), axis({ size: 48 })],
      series: [
        { label: "Time", value: (_u, v) => (v == null ? "–" : formatAgo(v)) },
        { label: "Produced", stroke: SERIES_COLORS.produced, width: 2 },
        { label: "Consumed", stroke: SERIES_COLORS.consumed, width: 2 },
      ],
    }),
    [],
  );
  const sparkOptions = useMemo(
    (): Omit<uPlot.Options, "width" | "height"> => ({
      legend: { show: false },
      cursor: { show: false },
      axes: [{ show: false }, { show: false }],
      scales: { x: { time: false } },
      series: [{}, { stroke: MUTED_LINE, width: 1.25, points: { show: false } }],
    }),
    [],
  );

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 p-4">
        <header className="flex items-center gap-3">
          <Button asChild size="sm">
            <a href="/">
              <ArrowLeft size={14} aria-hidden /> Back to game
            </a>
          </Button>
          <h1 className="text-lg font-bold">Factidle design system</h1>
          <span className="text-xs text-muted">Radix UI primitives, Tailwind tokens, uPlot charts</span>
        </header>

        <Section title="Color tokens">
          {COLOR_TOKENS.map((token) => (
            <div key={token} className="flex flex-col items-center gap-1">
              <span className="size-10 rounded-md border border-line-strong" style={{ background: `var(--color-${token})` }} />
              <code className="text-[11px] text-muted">{token}</code>
            </div>
          ))}
          {Object.entries(SERIES_COLORS).map(([name, color]) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <span className="size-10 rounded-md" style={{ background: color }} />
              <code className="text-[11px] text-muted">chart {name}</code>
            </div>
          ))}
        </Section>

        <Section title="Typography">
          <span className="text-base font-bold">Heading 16 bold</span>
          <span className="font-semibold">Title 13 semibold</span>
          <span>Body 13</span>
          <span className="text-xs text-muted">Caption 12 muted</span>
          <span className="font-mono tabular-nums">1,234.5/s mono</span>
        </Section>

        <Section title="Buttons">
          <Button variant="primary">Primary</Button>
          <Button>Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Tooltip content="aria-disabled keeps focus so the reason stays readable">
            <Button variant="primary" aria-disabled>
              Unavailable
            </Button>
          </Tooltip>
          <Button>
            <Save size={14} aria-hidden /> With icon
          </Button>
          <IconButton label="Icon button (ghost)" icon={<Trash2 size={14} />} />
          <IconButton label="Icon button (outline)" icon={<Download size={14} />} variant="outline" />
        </Section>

        <Section title="Chips">
          {TONES.map((tone) => (
            <Chip key={tone} tone={tone} tip={`tone="${tone}"`}>
              {tone}
            </Chip>
          ))}
          <Chip tip="Chips can hold icons and numbers">
            <ResourceIcon id="coal" size={14} /> 0.450/s
          </Chip>
        </Section>

        <Section title="Resource icons">
          {RESOURCE_IDS.map((id) => (
            <ResourceIcon key={id} id={id} size={28} tooltip={RESOURCES[id].name} />
          ))}
        </Section>

        <Section title="Form controls">
          <Select label="Demo select" value={select} options={OPTIONS} onChange={setSelect} />
          <Select label="Empty select" value={undefined} options={[]} onChange={() => {}} />
          <SegmentedControl
            label="Demo segmented control"
            value={segment}
            options={["5s", "1m", "10m", "1h", "10h"].map((v) => ({ value: v, label: v }))}
            onChange={setSegment}
          />
          <Switch label="Demo switch" checked={on} onChange={setOn} />
          <div className="flex w-64 items-center gap-2">
            <Slider label="Demo slider" value={slider} onChange={setSlider} />
            <span className="w-9 font-mono text-xs">{slider}%</span>
          </div>
          <Input aria-label="Demo input" placeholder="Input" />
          <Stepper label="Demo stepper" value={stepper} max={5} onChange={setStepper} />
        </Section>

        <Section title="Progress">
          {TONES.map((tone) => (
            <div key={tone} className="w-40">
              <ProgressBar value={0.65} label={`${tone} progress`} tone={tone} />
            </div>
          ))}
        </Section>

        <Section title="Tabs">
          <Tabs label="Demo tabs" value={tab} onChange={setTab} tabs={["one", "two", "three"].map((v) => ({ value: v, label: `Tab ${v}` }))}>
            <TabPanel value={tab}>
              <p className="text-xs text-muted">Content of tab {tab}. Arrow keys move between tabs.</p>
            </TabPanel>
          </Tabs>
        </Section>

        <Section title="Layout">
          <div className="w-72">
            <CollapsibleSection title="Collapsible section">
              <ul className="rounded-md border border-line bg-panel p-2 text-xs">Folded content</ul>
            </CollapsibleSection>
          </div>
          <div className="w-60">
            <EmptyState>Empty state: explain what to do next.</EmptyState>
          </div>
          <div className="flex h-10 items-center gap-2 text-xs">
            Left <Separator vertical /> Right
          </div>
          <ScrollArea className="h-24 w-48 rounded-md border border-line">
            <ul className="p-2 text-xs">
              {RESOURCE_IDS.map((id) => (
                <li key={id}>{RESOURCES[id].name}</li>
              ))}
            </ul>
          </ScrollArea>
        </Section>

        <Section title="Overlays">
          <Button onClick={() => setDialog(true)}>Open dialog</Button>
          <Button variant="danger" onClick={() => setConfirm(true)}>
            Open confirm
          </Button>
          <Popover trigger={<Button>Open popover</Button>}>
            <p className="text-xs">Popover content, anchored to its trigger.</p>
          </Popover>
          <Menu
            label="Dropdown menu"
            trigger={<Button>Open menu</Button>}
            items={[
              { key: "a", label: "Iron plate", icon: <ResourceIcon id="iron-plate" />, onSelect: () => {} },
              { key: "b", label: "With hint", hint: "12", onSelect: () => {} },
              { key: "c", label: "Disabled", hint: "Missing 3 × Pipe", disabled: true, onSelect: () => {} },
              { key: "d", label: "Danger", danger: true, separatorBefore: true, onSelect: () => {} },
            ]}
          />
          <Button onClick={() => setToasts((t) => [...t, Date.now()])}>Show toast</Button>
          <Dialog open={dialog} onOpenChange={setDialog} title="Dialog" className="w-96">
            <p className="text-xs text-muted">Escape or the close button dismisses it; focus is trapped inside.</p>
          </Dialog>
          <ConfirmDialog open={confirm} title="Confirm dialog" confirmLabel="Do it" danger onConfirm={() => {}} onClose={() => setConfirm(false)}>
            Used for destructive actions such as reset and import.
          </ConfirmDialog>
          {toasts.map((id) => (
            <Toast key={id} onClose={() => setToasts((t) => t.filter((x) => x !== id))}>
              Toast message
            </Toast>
          ))}
          <ToastViewport />
        </Section>

        <Section title="Charts (uPlot)">
          <div className="w-full">
            <UPlotChart options={chartOptions} data={data} height={220} />
          </div>
          <div className="w-12">
            <UPlotChart options={sparkOptions} data={[data[0], data[1]]} height={16} />
          </div>
          <span className="text-xs text-muted">Sparkline</span>
        </Section>
      </div>
    </ScrollArea>
  );
};

export { DesignSystemPage };
