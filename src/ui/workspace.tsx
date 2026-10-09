import { MACHINE_IDS, MACHINES, TABS } from "../engine/catalog";
import type { MachineId, TabId } from "../engine/catalog";
import type { GameState } from "../engine/types";
import { isUnlocked } from "../engine/unlocks";
import { useAppDispatch, useAppSelector } from "../store/store";
import { tabSelected } from "../store/ui-slice";
import { Panel } from "./design/panel";
import { ScrollArea } from "./design/scroll-area";
import { TabPanel, Tabs } from "./design/tabs";
import { QueueBar } from "./queue-bar";
import { MachineCard } from "./machine-card";
import { CombatPanel } from "./combat-panel";
import { ManualMining } from "./manual-mining";
import { PowerSummary } from "./power-summary";
import { ProductList } from "./product-list";
import { ResearchPanel } from "./research-panel";
import { RocketPanel } from "./rocket-panel";
import { StatsTab } from "./stats-tab";
import { StorageSummary } from "./storage-summary";

// Military is visible from the start: pollution can bring biters before turrets are researched.
const ALWAYS_VISIBLE = new Set<TabId>(["products", "military", "stats"]);

const machinesIn = (game: GameState, tab: TabId) => MACHINE_IDS.filter((id) => MACHINES[id].tab === tab && isUnlocked(game, id));

const visibleTabs = (game: GameState) => TABS.filter((t) => ALWAYS_VISIBLE.has(t.id) || machinesIn(game, t.id).length > 0);

const TabContent = ({ tab }: { tab: TabId }) => {
  // A joined string, so the tab only re-renders when a machine type unlocks.
  const ids = useAppSelector((s) => machinesIn(s.game, tab).join(","));
  const cards = ids ? (ids.split(",") as MachineId[]).map((id) => <MachineCard key={id} id={id} />) : [];
  switch (tab) {
    case "mining":
      return (
        <>
          <Panel aria-label="Manual mining">
            <h3 className="mb-2 font-semibold">Mine by hand</h3>
            <ManualMining />
          </Panel>
          {cards}
        </>
      );
    case "energy":
      return (
        <>
          <PowerSummary />
          {cards}
        </>
      );
    case "research":
      return (
        <>
          {cards}
          <ResearchPanel />
        </>
      );
    case "products":
      return (
        <>
          {cards}
          <ProductList />
        </>
      );
    case "logistics":
      return (
        <>
          <StorageSummary />
          {cards}
        </>
      );
    case "military":
      return (
        <>
          <CombatPanel />
          {cards}
        </>
      );
    case "rocket":
      return (
        <>
          <RocketPanel />
          {cards}
        </>
      );
    case "stats":
      return <StatsTab />;
    default:
      return <>{cards}</>;
  }
};

const Workspace = () => {
  const dispatch = useAppDispatch();
  const visible = useAppSelector((s) => visibleTabs(s.game).map((t) => t.id).join(","));
  const selected = useAppSelector((s) => s.ui.tab);
  const shown = TABS.filter((t) => visible.split(",").includes(t.id));
  const current = shown.some((t) => t.id === selected) ? selected : "mining";

  return (
    <div className="relative flex min-w-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        {/* Bottom padding keeps the last card reachable under the floating queue. */}
        <main className="max-w-5xl p-3 pb-20">
          <Tabs label="Production areas" value={current} onChange={(tab) => dispatch(tabSelected(tab))} tabs={shown.map((t) => ({ value: t.id, label: t.name }))}>
            <TabPanel value={current}>
              <TabContent tab={current} />
            </TabPanel>
          </Tabs>
        </main>
      </ScrollArea>
      <QueueBar />
    </div>
  );
};

export { Workspace };
