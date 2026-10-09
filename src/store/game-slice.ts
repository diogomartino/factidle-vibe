import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction, Reducer } from "@reduxjs/toolkit";
import type { ItemId, MachineId, ModuleId, OreId, RecipeId } from "../engine/catalog";
import { shootByHand } from "../engine/combat";
import { cancelCraft, enqueueCraft } from "../engine/crafting";
import { produceCapped } from "../engine/inventory";
import {
  addAllocation,
  addAssignment,
  assignMachines,
  removeAllocation,
  setAllocation,
  setModules,
  setPriority,
  setRunning,
  setStockTarget,
} from "../engine/machines";
import { completeAllResearch, dequeueResearch, queueResearch } from "../engine/research";
import { advanced, createNewGame } from "../engine/simulation";
import type { TechId } from "../engine/technologies";
import type { GameState } from "../engine/types";

type MachineRecipe = { machine: MachineId; recipe: RecipeId };

const gameSlice = createSlice({
  name: "game",
  initialState: createNewGame(),
  reducers: {
    // Handled by gameReducer below, outside Immer; this only creates the action.
    ticked: (_state, _action: PayloadAction<number>) => {},
    mined: (state, action: PayloadAction<{ ore: OreId; amount: number }>) => {
      produceCapped(state, action.payload.ore, action.payload.amount);
    },
    craftQueued: (state, { payload }: PayloadAction<{ recipe: RecipeId; count: number }>) => {
      enqueueCraft(state, payload.recipe, payload.count);
    },
    craftCancelled: (state, action: PayloadAction<number>) => cancelCraft(state, action.payload),
    allocationAdded: (state, { payload }: PayloadAction<MachineRecipe>) => addAllocation(state, payload.machine, payload.recipe),
    assignmentAdded: (state, { payload }: PayloadAction<MachineRecipe>) => addAssignment(state, payload.machine, payload.recipe),
    modulesSet: (state, { payload }: PayloadAction<{ machine: MachineId; module: ModuleId; count: number }>) =>
      setModules(state, payload.machine, payload.module, payload.count),
    shotByHand: (state) => {
      shootByHand(state);
    },
    peacefulToggled: (state) => {
      state.combat.peaceful = !state.combat.peaceful;
    },
    victoryAcknowledged: (state) => {
      state.rocket.acknowledged = true;
    },
    allocationRemoved: (state, { payload }: PayloadAction<MachineRecipe>) =>
      removeAllocation(state, payload.machine, payload.recipe),
    allocationSet: (state, { payload }: PayloadAction<MachineRecipe & { fraction: number }>) =>
      setAllocation(state, payload.machine, payload.recipe, payload.fraction),
    machinesAssigned: (state, { payload }: PayloadAction<MachineRecipe & { count: number }>) =>
      assignMachines(state, payload.machine, payload.recipe, payload.count),
    stockTargetSet: (state, { payload }: PayloadAction<{ item: ItemId; target: number | null }>) =>
      setStockTarget(state, payload.item, payload.target),
    machineToggled: (state, action: PayloadAction<MachineId>) => {
      const machine = state.machines[action.payload];
      machine.enabled = !machine.enabled;
    },
    runningSet: (state, { payload }: PayloadAction<{ machine: MachineId; fraction: number }>) =>
      setRunning(state, payload.machine, payload.fraction),
    prioritySet: (state, { payload }: PayloadAction<{ machine: MachineId; priority: number }>) =>
      setPriority(state, payload.machine, payload.priority),
    researchQueued: (state, action: PayloadAction<TechId>) => queueResearch(state, action.payload),
    allResearched: (state) => completeAllResearch(state),
    researchDequeued: (state, action: PayloadAction<TechId>) => dequeueResearch(state, action.payload),
    itemSet: (state, { payload }: PayloadAction<{ item: ItemId; amount: number }>) => {
      state.inventory[payload.item] = Math.max(0, payload.amount);
    },
    gameLoaded: (_state, action: PayloadAction<GameState>) => action.payload,
    gameReset: () => createNewGame(),
  },
});

const {
  shotByHand,
  peacefulToggled,
  allResearched,
  assignmentAdded,
  modulesSet,
  victoryAcknowledged,
  allocationAdded,
  allocationRemoved,
  allocationSet,
  craftCancelled,
  craftQueued,
  gameLoaded,
  gameReset,
  itemSet,
  machinesAssigned,
  machineToggled,
  mined,
  prioritySet,
  researchDequeued,
  researchQueued,
  runningSet,
  stockTargetSet,
  ticked,
} = gameSlice.actions;

/** Ticks skip Immer (see `advanced`); every other action goes through the slice. */
const gameReducer: Reducer<GameState> = (state, action) =>
  state && ticked.match(action) ? advanced(state, action.payload) : gameSlice.reducer(state, action);

export {
  shotByHand,
  peacefulToggled,
  allResearched,
  assignmentAdded,
  modulesSet,
  victoryAcknowledged,
  allocationAdded,
  allocationRemoved,
  allocationSet,
  craftCancelled,
  craftQueued,
  gameLoaded,
  gameReducer,
  gameReset,
  itemSet,
  machinesAssigned,
  machineToggled,
  mined,
  prioritySet,
  researchDequeued,
  researchQueued,
  runningSet,
  stockTargetSet,
  ticked,
};
