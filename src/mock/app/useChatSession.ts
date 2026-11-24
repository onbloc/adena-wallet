import { useEffect, useRef, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import { chatSessionKey, createChatSession, type ChatScope, type ChatSession } from '../../llm/core';

type Loaded = { key: string; session: ChatSession };
type Failure = { kind: 'load' | 'save'; message: string };

/** Only completed user/answer text is stored here. */
export function useChatSession(scope: ChatScope) {
  const key = chatSessionKey(scope);
  const persistent = scope.mode !== 'mock';
  const [loaded, setLoaded] = useState<Loaded>();
  const [failures, setFailures] = useState<ReadonlyMap<string, Failure>>(() => new Map());
  const [attempt, setAttempt] = useState(0);
  const sessions = useRef(new Map<string, ChatSession>());
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    const cached = sessions.current.get(key);
    let disposed = false;
    if (!persistent) {
      let session = cached;
      if (!session) {
        session = createChatSession();
        sessions.current.set(key, session);
      }
      setLoaded({ key, session });
    } else if (cached) {
      setLoaded({ key, session: cached });
    } else {
      void writes.current.then(() => Storage.getItem(key)).then(saved => {
        if (!disposed) {
          const session = sessions.current.get(key) ?? createChatSession(saved);
          sessions.current.set(key, session);
          setLoaded({ key, session });
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
          setFailures(active => new Map(active).set(key, { kind: 'load', message: 'Saved conversation could not be loaded.' }));
        }
      });
    }
    return () => { disposed = true; };
  }, [key, persistent, attempt]);

  const current = loaded?.key === key ? loaded : undefined;
  function publish(entry: Loaded, clear = false) {
    setLoaded(active => active?.session === entry.session ? { ...active } : active);
    if (!persistent) return;
    const snapshot = entry.session.serialize();
    writes.current = writes.current.then(async () => {
      if (clear) await Storage.removeItem(key);
      else await Storage.setItem(key, snapshot);
      setFailures(active => {
        if (!active.has(entry.key)) return active;
        const next = new Map(active);
        next.delete(entry.key);
        return next;
      });
    }).catch(() => {
      setFailures(active => new Map(active).set(entry.key, { kind: 'save', message: 'Conversation could not be saved on this device.' }));
    });
  }

  return {
    ready: current !== undefined,
    turns: current?.session.turns ?? [],
    error: failures.get(key)?.message,
    retry: () => current ? publish(current) : setAttempt(value => value + 1),
    messages: (prompt: string) => current?.session.messages(prompt),
    complete(prompt: string, answer: string) {
      if (!current?.session.complete(prompt, answer)) return false;
      publish(current);
      return true;
    },
    reset() {
      if (!current) return;
      current.session.reset();
      publish(current, true);
    },
  };
}
