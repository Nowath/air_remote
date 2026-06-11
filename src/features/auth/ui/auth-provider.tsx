"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { createClient } from "@/shared/api/supabase";

/** Minimal, client-safe view of the signed-in user (derived from the JWT). */
export type AuthUser = {
  id: string;
  email?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Client-side auth context (FSD `features/auth`).
 *
 * Seeded with `initialUser` from the server (see `@/app/providers`) so the first
 * client render already knows who is signed in — no unauthenticated flash. After
 * mount it subscribes to Supabase auth changes and keeps the user in sync across
 * tabs and after sign in/out.
 */
export function AuthProvider({
  initialUser = null,
  children,
}: {
  initialUser?: AuthUser | null;
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(
        session?.user
          ? { id: session.user.id, email: session.user.email }
          : null,
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Read the current auth state from any Client Component under `<AuthProvider>`. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
