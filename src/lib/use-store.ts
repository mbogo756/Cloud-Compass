import { useCallback, useEffect, useState } from "react";
import { clearStore, emptyStore, loadStore, saveStore, type Store } from "@/lib/quiz";

/** Device-local store. Loads after hydration to avoid SSR mismatches. */
export function useStore() {
  const [store, setStore] = useState<Store>(emptyStore);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setStore(loadStore());
    setReady(true);
  }, []);
  const update = useCallback((fn: (s: Store) => Store) => {
    setStore((prev) => {
      const next = fn(prev);
      if (next !== prev) saveStore(next);
      return next;
    });
  }, []);
  const reset = useCallback(() => {
    clearStore();
    setStore(emptyStore());
  }, []);
  return { store, ready, update, reset };
}
