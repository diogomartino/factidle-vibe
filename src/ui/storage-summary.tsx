import { BASE_FLUID_STORAGE, BASE_STORAGE_SLOTS, MACHINES, RESOURCES } from "../engine/catalog";
import { fluidStorage, storageSlots } from "../engine/inventory";
import { isUnlocked } from "../engine/unlocks";
import { useAppSelector } from "../store/store";
import { Panel } from "./design/panel";

const StorageSummary = () => {
  const slots = useAppSelector((s) => storageSlots(s.game));
  const fluid = useAppSelector((s) => fluidStorage(s.game));
  const tanks = useAppSelector((s) => isUnlocked(s.game, "storage-tank"));
  return (
    <Panel aria-labelledby="storage-summary">
      <h3 id="storage-summary" className="font-semibold">
        Storage
      </h3>
      <p className="mt-1 text-xs text-muted">
        Every item has {slots} slots ({BASE_STORAGE_SLOTS} base + chests). Its cap is slots × stack size, e.g. {slots * RESOURCES["iron-ore"].stackSize}{" "}
        iron ore or {slots * RESOURCES["copper-cable"].stackSize} copper cable. Machines whose output is full stop working.
      </p>
      {tanks && (
        <p className="mt-1 text-xs text-muted">
          Fluids don't use slots: each fluid holds up to {fluid.toLocaleString()} units ({BASE_FLUID_STORAGE.toLocaleString()} in pipes + {MACHINES["storage-tank"].fluidStorage!.toLocaleString()} per storage tank).
        </p>
      )}
    </Panel>
  );
};

export { StorageSummary };
