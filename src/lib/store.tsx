"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { notifications as seedNotifications } from "@/data/notifications";
import { currentUserSeed } from "@/data/creators";
import { learningPaths } from "@/data/paths";
import { tutorials } from "@/data/tutorials";
import type {
  AppNotification,
  Collection,
  CurrentUser,
  SkillLevel,
  Toast,
} from "@/lib/types";

const STORAGE_KEY = "eztips-state-v1";

type Persist = {
  onboarded: boolean;
  selectedGames: string[];
  selectedGoals: Record<string, string[]>;
  skillLevel: SkillLevel | null;
  liked: string[];
  helpful: string[];
  saved: string[];
  followedCreators: string[];
  followedGames: string[];
  collections: Collection[];
  xp: number;
  completedLessons: string[];
  completedTutorials: string[];
  pathProgress: Record<string, string[]>;
  history: string[];
  notifications: AppNotification[];
};

const defaults: Persist = {
  onboarded: false,
  selectedGames: [],
  selectedGoals: {},
  skillLevel: null,
  liked: [],
  helpful: [],
  saved: [],
  followedCreators: ["kai", "vex", "flick"],
  followedGames: [],
  collections: [
    { id: "col-ahri", name: "Ahri Combos", tutorialIds: ["t2", "t9"], public: true },
    { id: "col-mid", name: "Mid Lane Knowledge", tutorialIds: ["t1", "t2", "t12", "t19"], public: true },
    { id: "col-val", name: "Valorant Aim", tutorialIds: ["t6", "t15"], public: false },
    { id: "col-jett", name: "Jett Smokes", tutorialIds: ["t5", "t10"], public: true },
  ],
  xp: currentUserSeed.xp,
  completedLessons: ["l1", "l2", "l3", "m1", "m2", "a1"],
  completedTutorials: ["t6", "t9"],
  pathProgress: {
    "ahri-mastery": ["l1", "l2", "l3"],
    "mid-fundamentals": ["m1", "m2"],
    "aim-foundations": ["a1"],
  },
  history: ["t6", "t1", "t5"],
  notifications: seedNotifications,
};

function load(): Persist {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

type Store = Persist & {
  hydrated: boolean;
  toasts: Toast[];
  xpBurst: number | null;
  currentUser: CurrentUser;
  isLoggedIn: boolean;
  completeOnboarding: (
    games: string[],
    goals: Record<string, string[]>,
    skill: SkillLevel,
  ) => void;
  toggleLike: (id: string) => void;
  toggleHelpful: (id: string) => void;
  toggleSave: (id: string) => void;
  saveToCollection: (tutorialId: string, collectionId: string) => void;
  createCollection: (name: string, tutorialId?: string) => void;
  toggleFollowCreator: (id: string) => void;
  toggleFollowGame: (id: string) => void;
  toggleSelectedGame: (id: string) => void;
  addXp: (amount: number, reason?: string) => void;
  completeTutorial: (id: string) => void;
  completeLesson: (pathId: string, lessonId: string) => void;
  addHistory: (id: string) => void;
  toast: (message: string) => void;
  dismissToast: (id: string) => void;
  markAllRead: () => void;
  logout: () => void;
};

const Ctx = createContext<Store | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persist>(defaults);
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [xpBurst, setXpBurst] = useState<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const toast = useCallback((message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const addXp = useCallback(
    (amount: number, reason?: string) => {
      setState((s) => ({ ...s, xp: s.xp + amount }));
      setXpBurst(amount);
      setTimeout(() => setXpBurst(null), 900);
      if (reason) toast(reason);
    },
    [toast],
  );

  const completeOnboarding = useCallback(
    (games: string[], goals: Record<string, string[]>, skill: SkillLevel) => {
      setState((s) => ({
        ...s,
        onboarded: true,
        selectedGames: games,
        selectedGoals: goals,
        skillLevel: skill,
        followedGames: games,
      }));
    },
    [],
  );

  const toggleLike = useCallback((id: string) => {
    setState((s) => {
      const on = s.liked.includes(id);
      return { ...s, liked: on ? s.liked.filter((x) => x !== id) : [...s.liked, id] };
    });
  }, []);

  const toggleHelpful = useCallback(
    (id: string) => {
      const already = stateRef.current.helpful.includes(id);
      setState((s) => {
        const on = s.helpful.includes(id);
        if (on) return { ...s, helpful: s.helpful.filter((x) => x !== id) };
        return { ...s, helpful: [...s.helpful, id] };
      });
      if (!already) addXp(15, "+15 XP · marked helpful");
    },
    [addXp],
  );

  const toggleSave = useCallback(
    (id: string) => {
      const already = stateRef.current.saved.includes(id);
      setState((s) => {
        const on = s.saved.includes(id);
        return { ...s, saved: on ? s.saved.filter((x) => x !== id) : [...s.saved, id] };
      });
      const t = tutorials.find((x) => x.id === id);
      toast(already ? "Removed from saved" : t ? `Saved · ${t.title}` : "Saved");
    },
    [toast],
  );

  const saveToCollection = useCallback(
    (tutorialId: string, collectionId: string) => {
      const col = stateRef.current.collections.find((c) => c.id === collectionId);
      setState((s) => ({
        ...s,
        saved: s.saved.includes(tutorialId) ? s.saved : [...s.saved, tutorialId],
        collections: s.collections.map((c) =>
          c.id === collectionId && !c.tutorialIds.includes(tutorialId)
            ? { ...c, tutorialIds: [...c.tutorialIds, tutorialId] }
            : c,
        ),
      }));
      toast(col ? `Saved to ${col.name}` : "Saved to collection");
    },
    [toast],
  );

  const createCollection = useCallback(
    (name: string, tutorialId?: string) => {
      const id = `col-${Date.now()}`;
      setState((s) => ({
        ...s,
        collections: [
          ...s.collections,
          { id, name, tutorialIds: tutorialId ? [tutorialId] : [], public: false },
        ],
        saved:
          tutorialId && !s.saved.includes(tutorialId) ? [...s.saved, tutorialId] : s.saved,
      }));
      toast(`Created ${name}`);
    },
    [toast],
  );

  const toggleFollowCreator = useCallback(
    (id: string) => {
      const on = stateRef.current.followedCreators.includes(id);
      setState((s) => {
        const isOn = s.followedCreators.includes(id);
        return {
          ...s,
          followedCreators: isOn
            ? s.followedCreators.filter((x) => x !== id)
            : [...s.followedCreators, id],
        };
      });
      toast(on ? "Unfollowed" : "Following");
    },
    [toast],
  );

  const toggleFollowGame = useCallback((id: string) => {
    setState((s) => {
      const on = s.followedGames.includes(id);
      return {
        ...s,
        followedGames: on
          ? s.followedGames.filter((x) => x !== id)
          : [...s.followedGames, id],
      };
    });
  }, []);

  const toggleSelectedGame = useCallback(
    (id: string) => {
      const removing = stateRef.current.selectedGames.includes(id);
      if (removing && stateRef.current.selectedGames.length === 1) {
        toast("Keep at least one game in your feed");
        return;
      }
      setState((s) => ({
        ...s,
        selectedGames: s.selectedGames.includes(id)
          ? s.selectedGames.filter((gameId) => gameId !== id)
          : [...s.selectedGames, id],
      }));
      toast(removing ? "Removed from your feed" : "Added to your feed");
    },
    [toast],
  );

  const completeTutorial = useCallback(
    (id: string) => {
      if (stateRef.current.completedTutorials.includes(id)) return;
      setState((s) => {
        if (s.completedTutorials.includes(id)) return s;
        return { ...s, completedTutorials: [...s.completedTutorials, id] };
      });
      addXp(25, "+25 XP · tutorial complete");
    },
    [addXp],
  );

  const completeLesson = useCallback(
    (pathId: string, lessonId: string) => {
      if (stateRef.current.pathProgress[pathId]?.includes(lessonId)) return;
      setState((s) => {
        if (s.pathProgress[pathId]?.includes(lessonId)) return s;
        return {
          ...s,
          completedLessons: s.completedLessons.includes(lessonId)
            ? s.completedLessons
            : [...s.completedLessons, lessonId],
          pathProgress: {
            ...s.pathProgress,
            [pathId]: [...(s.pathProgress[pathId] ?? []), lessonId],
          },
        };
      });
      const path = learningPaths.find((p) => p.id === pathId);
      const done = (stateRef.current.pathProgress[pathId]?.length ?? 0) + 1;
      const last = path && done >= path.lessons.length;
      addXp(last ? 80 : 20, last ? "+80 XP · path complete" : "+20 XP · lesson complete");
    },
    [addXp],
  );

  const addHistory = useCallback((id: string) => {
    setState((s) => {
      if (s.history[0] === id) return s;
      return { ...s, history: [id, ...s.history.filter((x) => x !== id)].slice(0, 40) };
    });
  }, []);

  const markAllRead = useCallback(() => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ ...defaults, onboarded: false, selectedGames: [], skillLevel: null });
  }, []);

  const store: Store = useMemo(() => {
    const currentUser: CurrentUser = {
      ...currentUserSeed,
      xp: state.xp,
      level: 18 + Math.floor(Math.max(0, state.xp - currentUserSeed.xp) / 400),
    };

    return {
      ...state,
      hydrated,
      toasts,
      xpBurst,
      currentUser,
      isLoggedIn: state.onboarded,
      completeOnboarding,
      toggleLike,
      toggleHelpful,
      toggleSave,
      saveToCollection,
      createCollection,
      toggleFollowCreator,
      toggleFollowGame,
      toggleSelectedGame,
      addXp,
      completeTutorial,
      completeLesson,
      addHistory,
      toast,
      dismissToast,
      markAllRead,
      logout,
    };
  }, [
    state,
    hydrated,
    toasts,
    xpBurst,
    completeOnboarding,
    toggleLike,
    toggleHelpful,
    toggleSave,
    saveToCollection,
    createCollection,
    toggleFollowCreator,
    toggleFollowGame,
    toggleSelectedGame,
    addXp,
    completeTutorial,
    completeLesson,
    addHistory,
    toast,
    dismissToast,
    markAllRead,
    logout,
  ]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
