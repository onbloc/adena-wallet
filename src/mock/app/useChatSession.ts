import { useEffect, useRef, useState } from 'react';
import Storage from 'expo-sqlite/kv-store';
import type { AIAgent, AgentConversation, ConversationSettings } from '../../agent';
import { chatSessionKey, createChatSession, type ChatScope, type ChatSession, type ChatTurn, type GenerateEvent } from '../../llm/core';

type Loaded = { key: string; persistent: boolean; session: ChatSession };
type Failure = { kind: 'load' | 'save'; message: string };
type ActiveRun = { entry: Loaded; conversation: AgentConversation; controller: AbortController };

export type ChatSessionRunOptions = { account?: string; contextTokens?: number; signal?: AbortSignal; allowTransactionPreparation?: boolean };
export type ChatSessionState = {
  readonly ready: boolean;
  readonly turns: readonly ChatTurn[];
  readonly error: string | undefined;
  retry(): void;
  run(agent: AIAgent, settings: ConversationSettings, options?: ChatSessionRunOptions): AsyncGenerator<GenerateEvent>;
  reset(): void;
};

/** Only completed user/answer text is stored here. */
export function useChatSession(scope: ChatScope): ChatSessionState {
  const key = chatSessionKey(scope);
  const persistent = scope.mode !== 'mock';
  const [loaded, setLoaded] = useState<Loaded>();
  const [failures, setFailures] = useState<ReadonlyMap<string, Failure>>(() => new Map());
  const [attempt, setAttempt] = useState(0);
  const sessions = useRef(new Map<string, ChatSession>());
  const writes = useRef(Promise.resolve());
  const activeRun = useRef<ActiveRun | null>(null);
  const activeScope = useRef<string | null>(key);

  useEffect(() => {
    activeScope.current = key;
    const cached = sessions.current.get(key);
    let disposed = false;
    if (!persistent) {
      let session = cached;
      if (!session) {
        session = createChatSession();
        sessions.current.set(key, session);
      }
      setLoaded({ key, persistent, session });
    } else if (cached) {
      setLoaded({ key, persistent, session: cached });
    } else {
      void writes.current.then(() => Storage.getItem(key)).then(saved => {
        if (!disposed) {
          const session = sessions.current.get(key) ?? createChatSession(saved);
          sessions.current.set(key, session);
          setLoaded({ key, persistent, session });
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
    return () => {
      disposed = true;
      activeScope.current = null;
      if (activeRun.current?.entry.key === key) activeRun.current.controller.abort();
    };
  }, [key, persistent, attempt]);

  const current = loaded?.key === key ? loaded : undefined;
  function publish(entry: Loaded, clear = false) {
    setLoaded(active => active?.session === entry.session ? { ...active } : active);
    if (!entry.persistent) return;
    const snapshot = entry.session.serialize();
    writes.current = writes.current.then(async () => {
      if (clear) await Storage.removeItem(entry.key);
      else await Storage.setItem(entry.key, snapshot);
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
    get turns() { return current?.session.turns ?? []; },
    error: failures.get(key)?.message,
    retry: () => current ? publish(current) : setAttempt(value => value + 1),
    async *run(
      agent: AIAgent,
      settings: ConversationSettings,
      options: ChatSessionRunOptions = {}
    ): AsyncGenerator<GenerateEvent> {
      if (!current || activeScope.current !== current.key) throw new Error('Conversation is unavailable.');
      if (activeRun.current) throw new Error('A conversation is already running.');
      const entry = current;
      const controller = new AbortController();
      const conversation = agent.createConversation({
        session: entry.session, account: options.account, contextTokens: options.contextTokens,
        allowTransactionPreparation: options.allowTransactionPreparation,
      });
      const active = { entry, conversation, controller };
      const abort = () => controller.abort();
      activeRun.current = active;
      options.signal?.addEventListener('abort', abort, { once: true });
      if (options.signal?.aborted) controller.abort();
      try {
        yield* conversation.run(settings, { signal: controller.signal });
      } finally {
        options.signal?.removeEventListener('abort', abort);
        if (activeRun.current === active) {
          activeRun.current = null;
          publish(entry);
        }
      }
    },
    reset() {
      if (!current) return;
      if (activeRun.current?.entry.session === current.session) {
        const active = activeRun.current;
        activeRun.current = null;
        active.controller.abort();
        active.conversation.reset();
      }
      current.session.reset();
      publish(current, true);
    },
  };
}
