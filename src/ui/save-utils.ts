import type { GameState } from "../engine/types";
import { serialize } from "../store/persistence";

/** Downloads the game as a JSON save file. */
const downloadSave = (state: GameState) => {
  const url = URL.createObjectURL(new Blob([serialize(state)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `factidle-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export { downloadSave };
