import { useEffect, useRef } from "react";

/**
 * Runs a callback on a fixed interval. Automatically cleans up on unmount.
 * The callback ref is kept up-to-date so you don't need to memoize it.
 */
export function usePolling(
  callback: () => void,
  intervalMs: number,
  enabled = true
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => callbackRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
