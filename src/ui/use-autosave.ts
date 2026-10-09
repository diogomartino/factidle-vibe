import { useEffect } from "react";
import { saveToStorage } from "../store/persistence";
import { store } from "../store/store";

const AUTOSAVE_MS = 30_000;

/** Saves periodically and whenever the page is hidden or closed. */
const useAutosave = () => {
  useEffect(() => {
    const save = () => saveToStorage(store.getState().game);
    const onHide = () => document.visibilityState === "hidden" && save();
    const timer = window.setInterval(save, AUTOSAVE_MS);
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("beforeunload", save);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);
};

export { useAutosave };
