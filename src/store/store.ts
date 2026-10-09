import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { gameReducer } from "./game-slice";
import { loadFromStorage } from "./persistence";
import { noticeShown, uiReducer } from "./ui-slice";

/** Lets UI side effects (e.g. sounds) react to actions with the state before and after. */
const listener = createListenerMiddleware();

const createStore = () => {
  const { state: saved, error } = loadFromStorage();
  const created = configureStore({
    reducer: { game: gameReducer, ui: uiReducer },
    preloadedState: saved ? { game: saved } : undefined,
    // The game state is plain JSON; the dev checks would deep-walk it 10 times a second.
    middleware: (getDefault) => getDefault({ immutableCheck: false, serializableCheck: false }).prepend(listener.middleware),
  });
  if (error) created.dispatch(noticeShown({ kind: "error", text: `Your save couldn't be loaded, so a new game started. ${error}` }));
  return created;
};

const store = createStore();

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

const useAppDispatch = useDispatch.withTypes<AppDispatch>();
const useAppSelector = useSelector.withTypes<RootState>();
const startAppListening = listener.startListening.withTypes<RootState, AppDispatch>();

export { startAppListening, store, useAppDispatch, useAppSelector };
export type { AppDispatch, RootState };
