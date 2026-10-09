import { afterEach, describe, expect, it, vi } from "vitest";
import { enqueueCraft } from "../engine/crafting";
import { advance, createNewGame } from "../engine/simulation";
import { BACKUP_KEY, deserialize, loadFromStorage, MIGRATIONS, SAVE_VERSION, serialize } from "./persistence";

describe("loading from storage", () => {
  const stubStorage = (initial: Record<string, string>) => {
    const data = new Map(Object.entries(initial));
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    });
    return data;
  };
  afterEach(() => vi.unstubAllGlobals());

  it("loads a valid save", () => {
    stubStorage({ "factidle-save": serialize(createNewGame()) });
    expect(loadFromStorage()).toMatchObject({ error: null, state: { tick: 0 } });
  });

  it("backs up an unreadable save instead of letting autosave overwrite it", () => {
    const data = stubStorage({ "factidle-save": "{broken" });
    const result = loadFromStorage();
    expect(result.state).toBeNull();
    expect(result.error).toContain(BACKUP_KEY);
    expect(data.get(BACKUP_KEY)).toBe("{broken");
  });
});

describe("save files", () => {
  it("round-trips a game in progress", () => {
    const state = createNewGame();
    state.inventory.coal = 20;
    state.machines["burner-mining-drill"].allocations = { "mine-coal": 1 };
    enqueueCraft(state, "iron-gear-wheel", 2);
    advance(state, 60);
    const loaded = deserialize(serialize(state));
    expect({ ...loaded, report: state.report }).toEqual(state);
  });

  it("fills missing fields and drops unknown or invalid ones", () => {
    const text = JSON.stringify({
      version: SAVE_VERSION,
      savedAt: "",
      state: {
        inventory: { coal: 5, "iron-ore": -3, unobtainium: 9 },
        machines: { "stone-furnace": { count: 2, allocations: { "iron-plate": 0.8, "copper-plate": 0.8, "mine-coal": 1 } } },
        queue: [{ id: 1, recipe: "nope" }],
      },
    });
    const loaded = deserialize(text);
    expect(loaded.inventory.coal).toBe(5);
    expect(loaded.inventory["iron-ore"]).toBe(0);
    expect(loaded.machines["stone-furnace"].allocations).toEqual({ "iron-plate": 0.5, "copper-plate": 0.5 });
    expect(loaded.machines.boiler.count).toBe(0);
    expect(loaded.queue).toEqual([]);
    expect(loaded.unlocked).toContain("burner-mining-drill");
  });

  it("rejects saves older than the research update", () => {
    expect(() => deserialize(JSON.stringify({ version: 2, state: {} }))).toThrow("No migration");
  });

  it("rejects garbage and saves from the future", () => {
    expect(() => deserialize("{")).toThrow("not valid JSON");
    expect(() => deserialize("[]")).toThrow("missing");
    expect(() => deserialize(JSON.stringify({ version: SAVE_VERSION + 1, state: {} }))).toThrow("newer");
  });

  it("runs migrations in order", () => {
    const previous = SAVE_VERSION - 1;
    MIGRATIONS[previous] = (state) => ({ ...state, inventory: { coal: 42 } });
    try {
      expect(deserialize(JSON.stringify({ version: previous, state: {} })).inventory.coal).toBe(42);
    } finally {
      delete MIGRATIONS[previous];
    }
  });
});
