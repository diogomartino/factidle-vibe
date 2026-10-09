import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { ResourceId, TabId } from "../engine/catalog";
import { loadMuted } from "../ui/sound";

interface Notice {
  id: number;
  kind: "info" | "error";
  text: string;
}

interface UiState {
  tab: TabId;
  paused: boolean;
  debugOpen: boolean;
  /** Milliseconds spent on the last simulation dispatch. */
  tickMs: number;
  notices: Notice[];
  nextNoticeId: number;
  /** Resource shown in the production chart dialog, if open. */
  chartResource: ResourceId | null;
  muted: boolean;
}

const initialState: UiState = { tab: "mining", paused: false, debugOpen: false, tickMs: 0, notices: [], nextNoticeId: 1, chartResource: null, muted: loadMuted() };

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    tabSelected: (state, action: PayloadAction<TabId>) => {
      state.tab = action.payload;
    },
    pauseToggled: (state) => {
      state.paused = !state.paused;
    },
    debugToggled: (state, action: PayloadAction<boolean | undefined>) => {
      state.debugOpen = action.payload ?? !state.debugOpen;
    },
    tickTimed: (state, action: PayloadAction<number>) => {
      state.tickMs = action.payload;
    },
    noticeShown: (state, action: PayloadAction<Omit<Notice, "id">>) => {
      state.notices = [...state.notices.slice(-3), { ...action.payload, id: state.nextNoticeId++ }];
    },
    noticeDismissed: (state, action: PayloadAction<number>) => {
      state.notices = state.notices.filter((n) => n.id !== action.payload);
    },
    chartOpened: (state, action: PayloadAction<ResourceId | null>) => {
      state.chartResource = action.payload;
    },
    mutedToggled: (state) => {
      state.muted = !state.muted;
    },
  },
});

const { chartOpened, debugToggled, mutedToggled, noticeDismissed, noticeShown, pauseToggled, tabSelected, tickTimed } = uiSlice.actions;
const uiReducer = uiSlice.reducer;

export { chartOpened, debugToggled, mutedToggled, noticeDismissed, noticeShown, pauseToggled, tabSelected, tickTimed, uiReducer };
export type { Notice, UiState };
