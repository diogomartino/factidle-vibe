import { ChartDialog } from "./charts/chart-dialog";
import { InventorySidebar } from "./inventory-sidebar";
import { Notices } from "./notices";
import { TopBar } from "./top-bar";
import { useAutosave } from "./use-autosave";
import { useGameLoop } from "./use-game-loop";
import { useSoundEffects } from "./use-sound-effects";
import { AttackOverlay } from "./threat-indicator";
import { useCombatAlerts } from "./use-combat-alerts";
import { useUnlockNotices } from "./use-unlock-notices";
import { VictoryDialog } from "./victory-dialog";
import { Workspace } from "./workspace";

const App = () => {
  useGameLoop();
  useAutosave();
  useUnlockNotices();
  useSoundEffects();
  useCombatAlerts();
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <InventorySidebar />
        <Workspace />
      </div>
      <ChartDialog />
      <Notices />
      <VictoryDialog />
      <AttackOverlay />
    </div>
  );
};

export { App };
