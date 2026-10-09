import { AlertTriangle } from "lucide-react";
import { ITEM_IDS, recipesProducing, RESOURCES } from "../engine/catalog";
import type { FlowId, ItemId, ResourceId, ResourceKind } from "../engine/catalog";
import { capacityOf } from "../engine/inventory";
import type { UnlockId } from "../engine/unlocks";
import { useAppDispatch, useAppSelector } from "../store/store";
import { chartOpened } from "../store/ui-slice";
import { Sparkline } from "./charts/sparkline";
import { resourceList, starvedAmmo } from "./combat-utils";
import { CollapsibleSection } from "./design/collapsible-section";
import { ProgressBar } from "./design/progress-bar";
import { ScrollArea } from "./design/scroll-area";
import { ItemIcon, RecipeInfo } from "./recipe-info";
import { Tooltip } from "./design/tooltip";
import { formatAmount, formatRate, resourceName } from "./format-utils";
import type { GameState } from "../engine/types";

const GROUPS: Array<{ title: string; kind: ResourceKind }> = [
  { title: "Resources", kind: "resource" },
  { title: "Products", kind: "product" },
  { title: "Fluids", kind: "fluid" },
  { title: "Buildings in storage", kind: "building" },
];
const FLOWS: FlowId[] = ["water", "steam", "electricity"];

/** Last-minute trend; opens the full production chart. */
const TrendButton = ({ id }: { id: ResourceId }) => {
  const dispatch = useAppDispatch();
  return (
    <Tooltip content={`${resourceName(id)}: net rate, last minute. Click for details.`}>
      <button
        type="button"
        aria-label={`Open ${resourceName(id)} production chart`}
        onClick={() => dispatch(chartOpened(id))}
        className="h-5 w-12 shrink-0 rounded px-0.5 hover:bg-line-strong"
      >
        <Sparkline id={id} />
      </button>
    </Tooltip>
  );
};

/** Truncates long names; the tooltip has the full name and recipe. */
const ResourceName = ({ id }: { id: ResourceId }) => (
  <Tooltip content={<RecipeInfo id={id} />} side="right">
    <span className="min-w-0 flex-1 truncate text-xs text-muted">{resourceName(id)}</span>
  </Tooltip>
);

const RateText = ({ id, rate }: { id: ResourceId; rate: number }) => (
  <span className={`w-16 text-right font-mono text-[11px] ${rate > 1e-6 ? "text-good" : rate < -1e-6 ? "text-bad" : "text-muted"}`}>
    {Math.abs(rate) > 1e-6 ? formatRate(id, rate, true) : "–"}
  </span>
);

/** Storage fill in 5% steps: the bar doesn't need more precision, and fewer distinct values mean fewer re-renders. */
const fillStep = (amount: number, cap: number) => Math.min(1, Math.round((amount / cap) * 20) / 20);

/** Rates rounded to what the row shows (3 significant digits). */
const displayRate = (rate: number) => (Math.abs(rate) < 5e-4 ? 0 : Number(rate.toPrecision(3)));

const ItemRow = ({ id }: { id: ItemId }) => {
  // Selectors return display values, so a row re-renders only when what it shows changes.
  const amount = useAppSelector((s) => formatAmount(s.game.inventory[id]));
  const exact = useAppSelector((s) => Math.floor(s.game.inventory[id]));
  const cap = useAppSelector((s) => capacityOf(s.game, id));
  const fill = useAppSelector((s) => fillStep(s.game.inventory[id], capacityOf(s.game, id)));
  const rate = useAppSelector((s) => displayRate(s.game.report.rates[id] ?? 0));
  // Turrets waiting for this ammo while biters attack.
  const starved = useAppSelector((s) => resourceList(starvedAmmo(s.game)).includes(id));
  return (
    <li className={`flex flex-col gap-0.5 px-2 py-1 ${starved ? "animate-pulse bg-bad/15" : ""}`}>
      <div className="flex items-center gap-1.5">
        <ItemIcon id={id} />
        <ResourceName id={id} />
        {starved && (
          <Tooltip content="Turrets are out of this! Biters are getting through.">
            <AlertTriangle size={13} className="shrink-0 text-bad" aria-label="Turrets out of this" />
          </Tooltip>
        )}
        <span className="font-mono" aria-label={`${exact} of ${cap}`}>
          {amount}
          <span className="text-[11px] text-muted">/{formatAmount(cap)}</span>
        </span>
        <RateText id={id} rate={rate} />
        <TrendButton id={id} />
      </div>
      <ProgressBar value={fill} label={`${resourceName(id)} storage`} tone={fill >= 0.999 ? "bad" : fill > 0.9 ? "warn" : "neutral"} className="opacity-60" />
    </li>
  );
};

const FlowRow = ({ id }: { id: FlowId }) => {
  const text = useAppSelector((s) => `${formatRate(id, s.game.report.flows[id].produced)} / ${formatRate(id, s.game.report.flows[id].capacity)}`);
  const [produced, capacity] = text.split(" / ");
  return (
    <li className="flex items-center gap-1.5 px-2 py-1">
      <ItemIcon id={id} />
      <ResourceName id={id} />
      <span className="font-mono text-xs">
        {produced}
        <span className="text-[11px] text-muted"> / {capacity}</span>
      </span>
      <TrendButton id={id} />
    </li>
  );
};

/** Products and fluids appear once a recipe making them is unlocked (or you have some); buildings only while in storage. */
const visibleItems = (game: GameState, kind: ResourceKind) =>
  ITEM_IDS.filter(
    (id) =>
      RESOURCES[id].kind === kind &&
      (game.inventory[id] > 0 || kind === "resource" || (kind !== "building" && recipesProducing(id).some((r) => game.unlocked.includes(r as UnlockId)))),
  ).join(",");

const ItemGroup = ({ title, kind }: { title: string; kind: ResourceKind }) => {
  // A joined string: the group re-renders only when an item appears or disappears.
  const ids = useAppSelector((s) => visibleItems(s.game, kind));
  if (!ids) return null;
  return (
    <CollapsibleSection title={title}>
      <ul className="rounded-md border border-line bg-panel">
        {(ids.split(",") as ItemId[]).map((id) => (
          <ItemRow key={id} id={id} />
        ))}
      </ul>
    </CollapsibleSection>
  );
};

const InventorySidebar = () => (
  <aside aria-label="Inventory" className="w-80 shrink-0 border-r border-line">
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-2">
        {GROUPS.map(({ title, kind }) => (
          <ItemGroup key={kind} title={title} kind={kind} />
        ))}
        <CollapsibleSection title="Flows">
          <ul className="rounded-md border border-line bg-panel">
            {FLOWS.map((id) => (
              <FlowRow key={id} id={id} />
            ))}
          </ul>
        </CollapsibleSection>
      </div>
    </ScrollArea>
  </aside>
);

export { InventorySidebar };
