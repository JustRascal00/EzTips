"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

export type BackendProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
};

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  profile: BackendProfile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<BackendProfile | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  const refreshProfile = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    const { data: authData } = await supabase.auth.getUser();
    const nextUser = authData.user;
    setUser(nextUser);
    if (!nextUser) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id,username,display_name,avatar_url,bio")
      .eq("id", nextUser.id)
      .maybeSingle();
    setProfile((data as BackendProfile | null) ?? null);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      return;
    }
    queueMicrotask(() => {
      void refreshProfile().finally(() => setLoading(false));
    });
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void refreshProfile();
    });
    return () => listener.subscription.unsubscribe();
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(() => ({
    configured: supabaseConfigured,
    loading,
    user,
    profile,
    refreshProfile,
    signOut,
  }), [loading, profile, refreshProfile, signOut, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
