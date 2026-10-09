import { Bug, Download, EllipsisVertical, Palette, RotateCcw, Save, Upload, Volume2, VolumeX, Zap } from "lucide-react";
import { useRef, useState } from "react";
import type { GameState } from "../engine/types";
import { gameLoaded, gameReset, peacefulToggled } from "../store/game-slice";
import { clearStorage, deserialize, saveToStorage } from "../store/persistence";
import { store, useAppDispatch, useAppSelector } from "../store/store";
import { debugToggled, mutedToggled, noticeShown } from "../store/ui-slice";
import { DayCycle } from "./day-cycle";
import { ThreatIndicator } from "./threat-indicator";
import { DebugPanel } from "./debug-panel";
import { IconButton } from "./design/button";
import { Chip } from "./design/chip";
import { ConfirmDialog } from "./design/dialog";
import { Menu } from "./design/menu";
import type { MenuItem } from "./design/menu";
import { formatPower } from "./format-utils";
import { ResearchStatus } from "./research-status";
import { downloadSave } from "./save-utils";

/** Save, export, import, reset (and dev tools) behind one menu button. */
const GameMenu = () => {
  const dispatch = useAppDispatch();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<GameState | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const peaceful = useAppSelector((s) => s.game.combat.peaceful);
  const notify = (kind: "info" | "error", text: string) => dispatch(noticeShown({ kind, text }));

  const save = () =>
    saveToStorage(store.getState().game) ? notify("info", "Game saved.") : notify("error", "Could not save: browser storage is unavailable.");

  const importFile = async (file: File) => {
    try {
      setPendingImport(deserialize(await file.text()));
    } catch (error) {
      notify("error", `Import failed: ${error instanceof Error ? error.message : "unreadable file."}`);
    }
  };

  const items: MenuItem[] = [
    { key: "save", label: "Save game", icon: <Save size={14} aria-hidden />, onSelect: save },
    { key: "export", label: "Export save file", icon: <Download size={14} aria-hidden />, onSelect: () => downloadSave(store.getState().game) },
    { key: "import", label: "Import save file…", icon: <Upload size={14} aria-hidden />, onSelect: () => fileInput.current?.click() },
    {
      key: "peaceful",
      label: peaceful ? "Turn peaceful mode off" : "Turn peaceful mode on",
      icon: <Bug size={14} aria-hidden />,
      separatorBefore: true,
      onSelect: () => dispatch(peacefulToggled()),
    },
    ...(import.meta.env.DEV
      ? [
          { key: "design", label: "Design system", icon: <Palette size={14} aria-hidden />, separatorBefore: true, onSelect: () => window.location.assign("/design") },
          { key: "debug", label: "Debug panel", icon: <Bug size={14} aria-hidden />, onSelect: () => dispatch(debugToggled()) },
        ]
      : []),
    { key: "reset", label: "Reset game…", icon: <RotateCcw size={14} aria-hidden />, danger: true, separatorBefore: true, onSelect: () => setConfirmReset(true) },
  ];

  // A span wrapper gives the debug popover a DOM node to anchor to.
  const menu = (
    <span className="inline-flex">
      <Menu label="Game" trigger={<IconButton label="Game menu" icon={<EllipsisVertical size={14} />} variant="outline" />} items={items} />
    </span>
  );

  return (
    <>
      {import.meta.env.DEV ? <DebugPanel>{menu}</DebugPanel> : menu}
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void importFile(file);
        }}
      />
      <ConfirmDialog
        open={pendingImport !== null}
        title="Load imported save?"
        confirmLabel="Replace game"
        danger
        onClose={() => setPendingImport(null)}
        onConfirm={() => {
          if (!pendingImport) return;
          dispatch(gameLoaded(pendingImport));
          saveToStorage(pendingImport);
          notify("info", "Save imported.");
        }}
      >
        Your current game will be replaced. Export it first if you want to keep it.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmReset}
        title="Reset the game?"
        confirmLabel="Reset everything"
        danger
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          clearStorage();
          dispatch(gameReset());
          notify("info", "New game started.");
        }}
      >
        All progress, machines and items will be lost. This cannot be undone.
      </ConfirmDialog>
    </>
  );
};

/** Generation vs capacity. Selects text, so the top bar doesn't re-render every tick. */
const PowerChip = () => {
  const display = useAppSelector((s) => {
    const power = s.game.report.flows.electricity;
    if (power.capacity <= 0) return "";
    const short = power.demand > power.produced + Math.max(0, -s.game.report.power.accumulatorFlow) + 1e-6;
    return `${formatPower(power.produced)} / ${formatPower(power.capacity)}|${short ? "short" : ""}`;
  });
  if (!display) return null;
  const [text, short] = display.split("|");
  return (
    <Chip tone={short ? "bad" : "neutral"} tip="Power generated / generating capacity">
      <Zap size={13} className="text-warn" aria-hidden />
      {text}
    </Chip>
  );
};

const TopBar = () => {
  const dispatch = useAppDispatch();
  const muted = useAppSelector((s) => s.ui.muted);
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-3">
      <h1 className="flex items-center gap-2 text-base font-bold">
        <img src="/favicon.png" alt="" width={20} height={20} />
        Factidle
      </h1>
      <ResearchStatus />
      <DayCycle />
      <ThreatIndicator />
      <PowerChip />
      <div className="ml-auto flex items-center gap-1.5">
        <IconButton
          label={muted ? "Unmute sound effects" : "Mute sound effects"}
          icon={muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          variant="outline"
          aria-pressed={muted}
          onClick={() => dispatch(mutedToggled())}
        />
        <GameMenu />
      </div>
    </header>
  );
};

export { TopBar };
