"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/* ─── Types ─── */
export interface AuthUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  rememberedUsername: string | null;
  rememberedUsernames: string[];
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (
    fullName: string,
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  selectUsername: (username: string) => void;
}

const REMEMBERED_USERNAMES_KEY = "remembered_usernames";
const REMEMBERED_USERNAME_OLD_KEY = "remembered_username";

function loadUsernames(): string[] {
  try {
    // Migrate old single-username format to new array format
    const old = localStorage.getItem(REMEMBERED_USERNAME_OLD_KEY);
    const raw = localStorage.getItem(REMEMBERED_USERNAMES_KEY);

    if (!raw && old) {
      // Old key exists but new doesn't — migrate
      const list = [old];
      localStorage.setItem(REMEMBERED_USERNAMES_KEY, JSON.stringify(list));
      localStorage.removeItem(REMEMBERED_USERNAME_OLD_KEY);
      return list;
    }

    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsernames(list: string[]): void {
  localStorage.setItem(REMEMBERED_USERNAMES_KEY, JSON.stringify(list));
}

/* ─── Context ─── */
const AuthContext = createContext<AuthState | undefined>(undefined);

/* ─── Provider ─── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [rememberedUsernames, setRememberedUsernames] = useState<string[]>([]);
  const [rememberedUsername, setRememberedUsername] = useState<string | null>(
    null,
  );
  const router = useRouter();

  /* Restore session on mount */
  useEffect(() => {
    // Public paths that don't require auth — avoid redirect loops.
    // Must match proxy.ts publicPaths.
    const publicPaths = ["/login", "/register"];

    const saved = loadUsernames();
    setRememberedUsernames(saved);
    // The last saved username is the active one (most recently used)
    if (saved.length > 0) setRememberedUsername(saved[0]);

    let cancelled = false;

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.user) {
          setUser(data.user);
        } else {
          // Session invalid (stale cookie, server restart, etc.) —
          // The /api/auth/me route already cleared the cookie server-side.
          // If we're not on a public page, warn then redirect to login.
          const pathname = window.location.pathname;
          const onPublicPage = publicPaths.some((p) =>
            pathname.startsWith(p),
          );
          if (!onPublicPage) {
            toast.warning("Session expired — redirecting to login", {
              duration: 4000,
            });
            setTimeout(() => router.push("/login"), 2000);
          }
        }
      })
      .catch((e) => {
        console.error("[auth] session check failed:", e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const login = useCallback(
    async (emailOrUsername: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      setUser(data.user);

      // Save username to remembered list (most recent first)
      setRememberedUsernames((prev) => {
        const next = [emailOrUsername, ...prev.filter((u) => u !== emailOrUsername)];
        saveUsernames(next);
        return next;
      });
      setRememberedUsername(emailOrUsername);

      // Do NOT persist token to localStorage — session cookie handles it
    },
    [],
  );

  const register = useCallback(
    async (
      fullName: string,
      username: string,
      email: string,
      password: string,
    ) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
    },
    [],
  );

  const selectUsername = useCallback((username: string) => {
    setRememberedUsername(username);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        rememberedUsername,
        rememberedUsernames,
        login,
        register,
        logout,
        selectUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ─── Hook ─── */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
