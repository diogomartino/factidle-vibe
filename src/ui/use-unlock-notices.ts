import { useEffect, useRef } from "react";
import { RECIPES } from "../engine/catalog";
import { TECHNOLOGIES } from "../engine/technologies";
import { useAppDispatch, useAppSelector } from "../store/store";
import { noticeShown } from "../store/ui-slice";
import { bonusText } from "./research-utils";

const HIDDEN = new Set(["pumping", "boiling", "generating", "solar", "oil-extraction", "research"]);

/** Announces each finished technology and what it unlocked. */
const useUnlockNotices = () => {
  const dispatch = useAppDispatch();
  const researched = useAppSelector((s) => s.game.research.researched);
  const seen = useRef(researched.length);
  useEffect(() => {
    // Shrinks on reset/import: just resync.
    for (const id of researched.slice(seen.current)) {
      const tech = TECHNOLOGIES[id];
      const unlocks = tech.unlocks.filter((u) => !HIDDEN.has(RECIPES[u].category)).map((u) => RECIPES[u].name);
      const gained = [unlocks.length > 0 ? `unlocked ${unlocks.join(", ")}` : "", bonusText(tech)].filter(Boolean).join("; ");
      dispatch(noticeShown({ kind: "info", text: `Researched ${tech.name}: ${gained}` }));
    }
    seen.current = researched.length;
  }, [dispatch, researched]);
};

export { useUnlockNotices };
