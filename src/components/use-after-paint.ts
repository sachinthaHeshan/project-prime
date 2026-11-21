"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shows work as busy immediately, then applies the next value on a later frame
 * so a loading state can paint before a long calculation.
 */
export function useAfterPaint<T>(initial: T) {
  const [snapshot, setSnapshot] = useState({ value: initial, generation: 0 });
  const [busy, setBusy] = useState(false);
  const pending = useRef(initial);
  const tokenRef = useRef(0);
  const [ticket, setTicket] = useState(0);

  const commit = useCallback((next: T) => {
    pending.current = next;
    tokenRef.current += 1;
    setBusy(true);
    setTicket(tokenRef.current);
  }, []);

  useEffect(() => {
    if (ticket === 0) return;
    const generation = ticket;
    const id = window.setTimeout(() => {
      setSnapshot({ value: pending.current, generation });
    }, 0);
    return () => window.clearTimeout(id);
  }, [ticket]);

  const finish = useCallback((generation: number) => {
    if (generation !== tokenRef.current) return;
    setBusy(false);
  }, []);

  return { value: snapshot.value, generation: snapshot.generation, busy, commit, finish };
}
