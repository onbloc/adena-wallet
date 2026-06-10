// Single swap point for session message types.
// When gno-js-client >= X.X.X ships with PR #247:
//   1. Replace the export below with:
//      export { MsgCreateSession, MsgRevokeSession, MsgRevokeAllSessions } from '@gnolang/gno-js-client';
//   2. Delete src/proto/gno/.
export { MsgCreateSession, MsgRevokeSession, MsgRevokeAllSessions } from './gno/auth';
export type { DeepPartial, Exact, MessageFns } from './gno/auth';
