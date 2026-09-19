import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type AuthUser } from "@/lib/api";
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
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getSession()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
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
