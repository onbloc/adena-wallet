import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import type { AIAgent, AgentSettings } from '../../agent';
import { chatSessionKey, createChatSession, type ChatScope, type ChatSession, type ChatTurn, type GenerateEvent } from '../../llm/core';

type Loaded = { key: string; persistent: boolean; session: ChatSession };
type Failure = { kind: 'load' | 'save'; message: string };
type ActiveRun = { entry: Loaded; agent: AIAgent; controller: AbortController };

export type ChatSessionRunOptions = { account?: string; contextTokens?: number; signal?: AbortSignal; allowTransactionPreparation?: boolean };
export type ChatSessionState = {
  readonly ready: boolean;
  readonly turns: readonly ChatTurn[];
  /** The conversation to give the agent that runs next: `new AIAgent({ ..., session: history })`. */
  readonly history: ChatSession | undefined;
  readonly error: string | undefined;
  retry(): void;
  run(agent: AIAgent, settings: AgentSettings, options?: ChatSessionRunOptions): AsyncGenerator<GenerateEvent>;
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
  const lastAgent = useRef<AIAgent | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'background') return;
      lastAgent.current?.clearPending();
      activeRun.current?.controller.abort();
    });
    return () => subscription.remove();
  }, []);

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
      lastAgent.current?.clearPending();
      lastAgent.current = null;
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
    get history() { return current?.session; },
    error: failures.get(key)?.message,
    retry: () => current ? publish(current) : setAttempt(value => value + 1),
    async *run(
      agent: AIAgent,
      settings: AgentSettings,
      options: ChatSessionRunOptions = {}
    ): AsyncGenerator<GenerateEvent> {
      if (!current || activeScope.current !== current.key) throw new Error('Conversation is unavailable.');
      if (agent.session !== current.session) throw new Error('The agent continues another conversation.');
      if (activeRun.current) throw new Error('A conversation is already running.');
      const entry = current;
      const controller = new AbortController();
      if (lastAgent.current !== agent) lastAgent.current?.clearPending();
      if (!options.allowTransactionPreparation) agent.clearPending();
      lastAgent.current = agent;
      const active = { entry, agent, controller };
      const abort = () => controller.abort();
      activeRun.current = active;
      options.signal?.addEventListener('abort', abort, { once: true });
      if (options.signal?.aborted) controller.abort();
      try {
        yield* agent.run(settings, {
          account: options.account,
          contextTokens: options.contextTokens,
          allowTransactionPreparation: options.allowTransactionPreparation,
          signal: controller.signal,
        });
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
      lastAgent.current?.clearPending();
      if (activeRun.current?.entry.session === current.session) {
        const active = activeRun.current;
        activeRun.current = null;
        active.controller.abort();
        active.agent.reset();
      }
      current.session.reset();
      publish(current, true);
    },
  };
}
