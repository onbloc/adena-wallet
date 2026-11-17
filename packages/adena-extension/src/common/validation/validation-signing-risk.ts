import { MsgEndpoint } from '@gnolang/gno-js-client';
import {
  MSG_CREATE_SESSION_ENDPOINT,
  MSG_REVOKE_ALL_SESSIONS_ENDPOINT,
  MSG_REVOKE_SESSION_ENDPOINT,
} from 'adena-module';

export type SigningRiskLevel = 'low' | 'medium' | 'high';

export type SigningRiskCode =
  | 'NO_MESSAGES'
  | 'UNKNOWN_MESSAGE'
  | 'RUN_ARBITRARY_CODE'
  | 'DEPLOY_PACKAGE'
  | 'CREATE_SESSION'
  | 'SESSION_ALL_PATHS'
  | 'SESSION_WITHOUT_SPEND_LIMIT'
  | 'PACKAGE_PERMISSION'
  | 'CALL_UNKNOWN_REALM'
  | 'TOKEN_APPROVAL'
  | 'ATTACHED_FUNDS'
  | 'NEW_RECIPIENT';

export interface SigningRiskReason {
  code: SigningRiskCode;
  level: SigningRiskLevel;
  messageIndex: number;
}

export interface SigningRiskAssessment {
  level: SigningRiskLevel;
  reasons: SigningRiskReason[];
}

export interface SigningRiskContext {
  /** Realm paths the user has called before or that the wallet ships as trusted. */
  knownRealmPaths?: ReadonlySet<string>;
  /** Addresses in the address book or the user's own accounts. */
  knownRecipients?: ReadonlySet<string>;
}

const LEVEL_ORDER: Record<SigningRiskLevel, number> = { low: 0, medium: 1, high: 2 };

const isNonEmptyCoins = (value: unknown): boolean =>
  typeof value === 'string' && value.trim() !== '';

/**
 * Grades a Gno transaction before the user signs it, so the approval screen can
 * ask for extra confirmation on the requests attackers rely on: arbitrary code
 * (`MsgRun`), package deployment, and session keys that can sign on the user's
 * behalf later. Unknown message types are treated as high risk, never skipped.
 */
export const classifyGnoSigningRisk = (
  messages: ReadonlyArray<{ type?: string; value?: any }> | undefined,
  context: SigningRiskContext = {},
): SigningRiskAssessment => {
  const reasons: SigningRiskReason[] = [];
  const add = (code: SigningRiskCode, level: SigningRiskLevel, messageIndex: number): void => {
    reasons.push({ code, level, messageIndex });
  };

  if (!messages || messages.length === 0) {
    add('NO_MESSAGES', 'high', -1);
  }

  (messages ?? []).forEach((message, index) => {
    const value = message?.value ?? {};

    switch (message?.type) {
      case MsgEndpoint.MSG_RUN:
        add('RUN_ARBITRARY_CODE', 'high', index);
        break;
      case MsgEndpoint.MSG_ADD_PKG:
        add('DEPLOY_PACKAGE', 'high', index);
        break;
      case MSG_CREATE_SESSION_ENDPOINT: {
        add('CREATE_SESSION', 'high', index);
        const allowPaths: unknown = value.allow_paths;
        if (Array.isArray(allowPaths) && allowPaths.some((path) => path === '*')) {
          add('SESSION_ALL_PATHS', 'high', index);
        }
        if (!isNonEmptyCoins(value.spend_limit)) {
          add('SESSION_WITHOUT_SPEND_LIMIT', 'high', index);
        }
        break;
      }
      case MsgEndpoint.MSG_ENABLE_PKG:
      case MsgEndpoint.MSG_REJECT_PKG:
        add('PACKAGE_PERMISSION', 'medium', index);
        break;
      case MSG_REVOKE_SESSION_ENDPOINT:
      case MSG_REVOKE_ALL_SESSIONS_ENDPOINT:
        // Revoking only removes signing power.
        break;
      case MsgEndpoint.MSG_CALL:
        if (!context.knownRealmPaths?.has(value.pkg_path)) {
          add('CALL_UNKNOWN_REALM', 'medium', index);
        }
        if (typeof value.func === 'string' && value.func.toLowerCase() === 'approve') {
          add('TOKEN_APPROVAL', 'medium', index);
        }
        if (isNonEmptyCoins(value.send)) {
          add('ATTACHED_FUNDS', 'medium', index);
        }
        break;
      case MsgEndpoint.MSG_SEND:
        if (!context.knownRecipients?.has(value.to_address)) {
          add('NEW_RECIPIENT', 'medium', index);
        }
        break;
      default:
        add('UNKNOWN_MESSAGE', 'high', index);
    }
  });

  const level = reasons.reduce<SigningRiskLevel>(
    (highest, reason) => (LEVEL_ORDER[reason.level] > LEVEL_ORDER[highest] ? reason.level : highest),
    'low',
  );

  return { level, reasons };
};
