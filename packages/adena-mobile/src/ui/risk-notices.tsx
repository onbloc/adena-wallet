import type {
  SigningRiskAssessment,
  SigningRiskCode,
} from '@common/validation/validation-signing-risk';
import React from 'react';

import {Notice} from './components';

const MESSAGES: Record<SigningRiskCode, string> = {
  NO_MESSAGES: 'The request contains no messages.',
  UNKNOWN_MESSAGE:
    'The request contains a message type Adena cannot display. Do not sign it unless you know exactly what it does.',
  RUN_ARBITRARY_CODE:
    'This runs arbitrary code with your account. It can move any of your assets.',
  DEPLOY_PACKAGE: 'This deploys a package from your account.',
  CREATE_SESSION:
    'This creates a session key that can sign transactions for you later without asking.',
  SESSION_ALL_PATHS: 'The session key may call any realm.',
  SESSION_WITHOUT_SPEND_LIMIT: 'The session key has no spending limit.',
  PACKAGE_PERMISSION: 'This changes package permissions for your account.',
  CALL_UNKNOWN_REALM: 'You have not used this realm before.',
  TOKEN_APPROVAL: 'This approves another address to spend your tokens.',
  ATTACHED_FUNDS: 'GNOT is sent along with this call.',
  NEW_RECIPIENT: 'You have not sent to this address before.',
};

/** One notice per reason; high-risk reasons are shown as danger. */
export function RiskNotices({risk}: {risk: SigningRiskAssessment}) {
  const unique = Array.from(
    new Map(risk.reasons.map(reason => [reason.code, reason])).values(),
  );
  return (
    <>
      {unique.map(reason => (
        <Notice
          key={reason.code}
          tone={reason.level === 'high' ? 'danger' : 'warning'}>
          {MESSAGES[reason.code]}
        </Notice>
      ))}
    </>
  );
}
