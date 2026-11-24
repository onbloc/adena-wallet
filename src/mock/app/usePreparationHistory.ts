import { useEffect, useRef, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import type { ChatScope } from '../../llm/core';
import { createPreparationHistory, preparationHistoryKey, type PreparationHistory, type PreparationKind } from './preparationHistory';

type Loaded = { key: string; history: PreparationHistory };
type Failure = { kind: 'load' | 'save'; message: string };

/** A read-only recovery record: opening it never reconstructs or prepares a transaction. */
export function usePreparationHistory(scope: Extract<ChatScope, { mode: 'onbloc' }> | undefined) {
  const key = scope && preparationHistoryKey(scope);
  const [loaded, setLoaded] = useState<Loaded>();
  const [failures, setFailures] = useState<ReadonlyMap<string, Failure>>(() => new Map());
  const [attempt, setAttempt] = useState(0);
  const writes = useRef(Promise.resolve());
  const histories = useRef(new Map<string, PreparationHistory>());

  useEffect(() => {
    let disposed = false;
    const cached = key ? histories.current.get(key) : undefined;
    if (key && cached) {
      setLoaded({ key, history: cached });
    } else if (key) {
      void writes.current.then(() => Storage.getItem(key)).then(saved => {
        if (!disposed) {
          const history = histories.current.get(key) ?? createPreparationHistory(saved);
          histories.current.set(key, history);
          setLoaded({ key, history });
          setFailures(active => {
            if (active.get(key)?.kind !== 'load') return active;
            const next = new Map(active);
            next.delete(key);
            return next;
          });
        }
      }).catch(() => {
        if (!disposed) {
          setLoaded(active => active?.key === key ? undefined : active);
          setFailures(active => new Map(active).set(key, { kind: 'load', message: 'Preparation history could not be loaded.' }));
        }
      });
    }
    return () => { disposed = true; };
  }, [key, attempt]);

  const current = loaded?.key === key ? loaded : undefined;
  function publish(entry: Loaded): Promise<void> {
    setLoaded(active => active?.history === entry.history ? { ...active } : active);
    const snapshot = entry.history.serialize();
    const write = writes.current.then(() => Storage.setItem(entry.key, snapshot));
    writes.current = write.catch(() => {});
    return write.then(() => {
      setFailures(active => {
        if (!active.has(entry.key)) return active;
        const next = new Map(active);
        next.delete(entry.key);
        return next;
      });
    }).catch(() => {
      setFailures(active => new Map(active).set(entry.key, { kind: 'save', message: 'Preparation status could not be saved on this device.' }));
    });
  }

  return {
    ready: !key || current !== undefined,
    prepared: current?.history.prepared ?? [],
    error: key ? failures.get(key)?.message : undefined,
    retry: () => current ? void publish(current) : setAttempt(value => value + 1),
    async record(kind: PreparationKind) {
      if (!current) throw new Error('Preparation history is unavailable.');
      current.history.record(kind);
      await publish(current);
    },
  };
}
