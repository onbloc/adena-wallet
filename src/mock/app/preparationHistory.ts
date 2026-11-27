import { z } from 'zod';
import type { ChatScope } from '../../llm/core';

const kindSchema = z.enum(['transfer', 'allowance']);
const snapshotSchema = z.strictObject({ version: z.literal(1), prepared: z.array(kindSchema).max(50) });
export type PreparationKind = z.infer<typeof kindSchema>;
export type PreparationHistory = {
  readonly prepared: readonly PreparationKind[];
  record(kind: PreparationKind): void;
  serialize(): string;
};

/** Preparation outcomes are scoped independently from the model's conversation text. */
export function preparationHistoryKey(scope: Extract<ChatScope, { mode: 'onbloc' }>): string {
  return JSON.stringify(['adena-preparations-v1', scope.endpoint, scope.chainId, scope.account]);
}

/** Store only the kind of a completed preparation, never its transaction or its arguments. */
export function createPreparationHistory(saved?: string | null): PreparationHistory {
  let prepared: readonly PreparationKind[] = [];
  if (saved) {
    let decoded: unknown;
    try { decoded = JSON.parse(saved); } catch { /* Discard corrupt snapshots. */ }
    const parsed = snapshotSchema.safeParse(decoded);
    if (parsed.success) prepared = parsed.data.prepared;
  }
  return {
    get prepared() { return prepared; },
    record(kind: PreparationKind) {
      prepared = [...prepared.slice(-49), kindSchema.parse(kind)];
    },
    serialize() { return JSON.stringify({ version: 1, prepared }); },
  };
}
