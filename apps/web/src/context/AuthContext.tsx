import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, type AuthUser, type Gender } from "@/lib/api";
import { getSession } from "@/lib/session";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    dateOfBirth: string;
    guardianEmail?: string;
    gender?: Gender;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_CACHE = "lunee.user";

/** Last known profile, shown instantly on reload while /me revalidates in the background. Cleared on sign-out. */
function readCachedUser(): AuthUser | null {
  try {
    if (!getSession()) return null;
    const raw = localStorage.getItem(USER_CACHE);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(USER_CACHE, JSON.stringify(user));
    else localStorage.removeItem(USER_CACHE);
  } catch {
    /* private mode: no cache, just slower */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(readCachedUser);
  const [loading, setLoading] = useState(() => readCachedUser() === null);
  const setUser = (u: AuthUser | null) => {
    setUserState(u);
    writeCachedUser(u);
  };

  useEffect(() => {
    if (!getSession()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch((err) => {
        // A real 401 means the session is dead — sign out. Anything else
        // (network blip, 5xx, proxy hiccup) shouldn't log someone out from
        // under them; keep the cached user and let the next successful
        // call refresh it.
        if (err instanceof ApiError && err.status === 401) setUser(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    async login(email, password) {
      const { user } = await api.login({ email, password });
      setUser(user);
      return user;
    },
    async register(data) {
      const { user } = await api.register(data);
      setUser(user);
      return user;
    },
    async logout() {
      await api.logout();
      setUser(null);
    },
    async refreshUser() {
      const { user } = await api.me();
      setUser(user);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
