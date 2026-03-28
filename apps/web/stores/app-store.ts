import { assertPersistenceWhitelist, PERSISTENCE_POLICY } from "./persistence-policy";

type PreferencesSlice = {
  theme: "light" | "dark";
  setTheme: (theme: PreferencesSlice["theme"]) => void;
};

type UiSlice = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
};

export type AppStore = {
  preferences: PreferencesSlice;
  ui: UiSlice;
};

const initialState: AppStore = {
  preferences: {
    theme: "light",
    setTheme: () => undefined,
  },
  ui: {
    sidebarOpen: false,
    toggleSidebar: () => undefined,
  },
};

let state: AppStore = initialState;

export function createAppStore() {
  const getState = () => state;

  const setState = (recipe: (draft: AppStore) => AppStore) => {
    state = recipe(state);
    persistSafeSlices(state);
  };

  state = {
    preferences: {
      theme: state.preferences.theme,
      setTheme: (theme) =>
        setState((draft) => ({
          ...draft,
          preferences: { ...draft.preferences, theme },
        })),
    },
    ui: {
      sidebarOpen: state.ui.sidebarOpen,
      toggleSidebar: () =>
        setState((draft) => ({
          ...draft,
          ui: { ...draft.ui, sidebarOpen: !draft.ui.sidebarOpen },
        })),
    },
  };

  return { getState };
}

function persistSafeSlices(nextState: AppStore): void {
  if (typeof window === "undefined") return;

  for (const sliceName of PERSISTENCE_POLICY.allowedSlices) {
    assertPersistenceWhitelist(sliceName);
  }

  const persisted: Pick<AppStore, "preferences" | "ui"> = {
    preferences: nextState.preferences,
    ui: nextState.ui,
  };

  window.localStorage.setItem(PERSISTENCE_POLICY.storageKey, JSON.stringify(persisted));
}
