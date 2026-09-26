import { useCallback, useEffect, useState } from "react";

export type Coords = { lat: number; lng: number };
export type LocationStatus = "unknown" | "prompt" | "loading" | "on" | "denied" | "unsupported" | "error";

const KEY = "lunee.location";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

// About 1 km of precision is plenty for "labs near me" and keeps the saved value from being an exact address.
const round = (n: number) => Math.round(n * 100) / 100;

function readSaved(): Coords | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Coords & { at: number };
    return Date.now() - v.at < MAX_AGE_MS ? { lat: v.lat, lng: v.lng } : null;
  } catch {
    return null;
  }
}

function save(c: Coords | null) {
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify({ ...c, at: Date.now() }));
    else localStorage.removeItem(KEY);
  } catch {
    /* not remembered */
  }
}

/**
 * Location for "near me". If the browser has already been allowed, it is used automatically (no prompt); a
 * saved approximate spot shows results instantly while a fresh fix is fetched. Otherwise nothing is asked
 * until the person taps `request()`. `turnOff()` forgets the saved spot.
 */
export function useLocation(autoIfGranted = true) {
  const [coords, setCoords] = useState<Coords | null>(readSaved);
  const [status, setStatus] = useState<LocationStatus>(() => (readSaved() ? "on" : "unknown"));

  const fetchFix = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus((s) => (s === "on" ? s : "loading"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) };
        setCoords(c);
        save(c);
        setStatus("on");
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    const perms = navigator.permissions;
    if (!perms?.query) {
      setStatus((s) => (s === "unknown" ? "prompt" : s));
      return;
    }
    let live = true;
    perms
      .query({ name: "geolocation" as PermissionName })
      .then((p) => {
        if (!live) return;
        if (p.state === "granted") {
          if (autoIfGranted) fetchFix();
        } else if (p.state === "denied") setStatus("denied");
        else setStatus((s) => (s === "on" ? s : "prompt"));
      })
      .catch(() => setStatus((s) => (s === "unknown" ? "prompt" : s)));
    return () => {
      live = false;
    };
  }, [autoIfGranted, fetchFix]);

  const turnOff = useCallback(() => {
    save(null);
    setCoords(null);
    setStatus("prompt");
  }, []);

  return { coords, status, request: fetchFix, turnOff };
}
