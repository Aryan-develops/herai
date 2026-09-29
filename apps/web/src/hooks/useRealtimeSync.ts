import { useEffect } from "react";
import { watchRealtime, type RealtimeWatch } from "@/lib/realtime";

/** Re-runs `onChange` whenever a row matching `watches` changes on the server, so this device reflects other devices/partner live. */
export function useRealtimeSync(watches: RealtimeWatch[], onChange: () => void, deps: React.DependencyList) {
  useEffect(() => {
    return watchRealtime(watches, onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
