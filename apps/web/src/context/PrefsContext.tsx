import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, type NotificationPrefs } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface PrefsContextValue {
  prefs: NotificationPrefs | null;
  /** Saves a change and updates every screen that reads preferences (Settings, Partner home, insights…). */
  update: (patch: Partial<NotificationPrefs>) => Promise<void>;
  error: string | null;
}

const PrefsContext = createContext<PrefsContextValue | undefined>(undefined);

/** One shared copy of the person's preferences, so a change in Settings is reflected everywhere at once. */
export function PrefsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = !!user && user.consentStatus !== "pending" && !user.needsDateOfBirth;

  useEffect(() => {
    if (!ready) {
      setPrefs(null);
      return;
    }
    api.getPrefs().then(({ prefs }) => setPrefs(prefs)).catch(() => setError("Couldn't load your preferences."));
  }, [ready, user?.id]);

  const update = useCallback(
    async (patch: Partial<NotificationPrefs>) => {
      const previous = prefs;
      setError(null);
      setPrefs((p) => (p ? { ...p, ...patch } : p));
      try {
        setPrefs((await api.updatePrefs(patch)).prefs);
      } catch (err) {
        setPrefs(previous);
        setError(err instanceof ApiError ? err.message : "Couldn't save that.");
      }
    },
    [prefs],
  );

  return <PrefsContext.Provider value={{ prefs, update, error }}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used within PrefsProvider");
  return ctx;
}
