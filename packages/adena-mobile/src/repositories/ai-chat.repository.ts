import { AI_CHAT_KEY_PREFIX } from '../migration/storage-keys';
import { KeyValueStore } from '../storage/key-value-store';

// One conversation per account and network.
export interface AiChatScope {
  networkId: string;
  accountId: string;
}

export interface AiChatRepository {
  // The opaque snapshot produced by the AI library's session.serialize().
  load(scope: AiChatScope): string | undefined;
  save(scope: AiChatScope, snapshot: string): void;
  clear(scope: AiChatScope): void;
  // Drops a removed account's conversations on every network.
  removeAccount(accountId: string): void;
}

const keyOf = ({ networkId, accountId }: AiChatScope): string => `${AI_CHAT_KEY_PREFIX}${JSON.stringify([networkId, accountId])}`;

export class StorageAiChatRepository implements AiChatRepository {
  constructor(private readonly store: KeyValueStore) {}

  load(scope: AiChatScope): string | undefined {
    return this.store.getString(keyOf(scope));
  }

  save(scope: AiChatScope, snapshot: string): void {
    this.store.setString(keyOf(scope), snapshot);
  }

  clear(scope: AiChatScope): void {
    this.store.remove(keyOf(scope));
  }

  removeAccount(accountId: string): void {
    for (const key of this.store.getAllKeys()) {
      if (!key.startsWith(AI_CHAT_KEY_PREFIX)) {
        continue;
      }

      let scope: unknown;

      try {
        scope = JSON.parse(key.slice(AI_CHAT_KEY_PREFIX.length)) as unknown;
      }
      catch {
        continue;
      }

      if (Array.isArray(scope) && scope.length === 2 && scope[1] === accountId) {
        this.store.remove(key);
      }
    }
  }
}
