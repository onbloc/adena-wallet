import { BigNumber } from '../utils/big-number';
import { CARD_DURATIONS, CardDuration, CardPermissionKind, IssuablePermission, SPEND_PERIODS, SpendPeriod } from './session-card';

// Card creation is a short scripted chat: each template asks a fixed set of questions with fixed answers.

export const CardTemplateId = {
  SEND: 'send',
  TRADE: 'trade',
  ORDERS: 'orders',
} as const;

export type CardTemplateId = (typeof CardTemplateId)[keyof typeof CardTemplateId];

export interface CardTemplatePaths {
  // GnoSwap router and the wrapped native coin it trades (wrap + approve go through it).
  routerPath?: string;
  wrappedNativePackagePath?: string;
  dcaPath?: string;
  limitPath?: string;
}

export interface CardTemplate {
  id: CardTemplateId;
  label: string;
  description: string;
  defaultName: string;
  permissions: IssuablePermission[];
  // Can schedule a send signed by the card itself.
  schedulable: boolean;
}

const realm = (path: string): IssuablePermission => ({ kind: CardPermissionKind.REALM, path });

export const cardTemplates = (paths: CardTemplatePaths): CardTemplate[] => [
  {
    id: CardTemplateId.SEND,
    label: 'Send GNOT',
    description: 'Send GNOT to any address, up to its limit',
    defaultName: 'GNOT sender',
    permissions: [{ kind: CardPermissionKind.SEND }],
    schedulable: true,
  },
  ...(paths.routerPath && paths.wrappedNativePackagePath
    ? [{
        id: CardTemplateId.TRADE,
        label: 'Trade on GnoSwap',
        description: 'Swap through the GnoSwap router',
        defaultName: 'GnoSwap trader',
        permissions: [realm(paths.routerPath), realm(paths.wrappedNativePackagePath)],
        schedulable: false,
      }]
    : []),
  ...(paths.dcaPath && paths.limitPath
    ? [{
        id: CardTemplateId.ORDERS,
        label: 'Manage GnoSwap orders',
        description: 'Claim and cancel your recurring buys and limit orders',
        defaultName: 'Order manager',
        permissions: [realm(paths.dcaPath), realm(paths.limitPath)],
        schedulable: false,
      }]
    : []),
];

// Display GNOT amounts offered as the card limit.
export const LIMIT_CHOICES = ['1', '5', '10', '50'];
export const SCHEDULE_DELAYS_SECONDS = [10, 30, 60];
// Display GNOT amounts a scheduled send may move.
export const SCHEDULE_AMOUNT_CHOICES = ['0.1', '0.5', '1'];
// Raw native amount kept back from the limit for the scheduled send's network fee.
export const SCHEDULED_FEE_RESERVE = '100000';

// A reset longer than the card's life would never happen.
export const periodChoices = (duration: CardDuration): SpendPeriod[] => SPEND_PERIODS.filter(period => period <= duration);

export const durationChoices = (): CardDuration[] => CARD_DURATIONS;

// Raw amounts that still leave the fee reserve inside the limit.
export const scheduleAmountChoices = (limit: string, decimals: number): string[] =>
  SCHEDULE_AMOUNT_CHOICES.filter(choice =>
    new BigNumber(choice).shiftedBy(decimals).plus(SCHEDULED_FEE_RESERVE).isLessThanOrEqualTo(limit));

export interface ScheduledSend {
  toAddress: string;
  // Raw native amount.
  amount: string;
  delaySeconds: number;
}

export const ChatStep = {
  TEMPLATE: 'template',
  LIMIT: 'limit',
  DURATION: 'duration',
  PERIOD: 'period',
  SCHEDULE: 'schedule',
  RECIPIENT: 'recipient',
  AMOUNT: 'amount',
  DELAY: 'delay',
  CONFIRM: 'confirm',
} as const;

export type ChatStep = (typeof ChatStep)[keyof typeof ChatStep];

export interface ChatAnswers {
  template?: CardTemplate;
  limit?: string;
  duration?: CardDuration;
  period?: SpendPeriod;
  schedule?: boolean;
  recipient?: string;
  amount?: string;
  delaySeconds?: number;
}

// The first question still unanswered.
export const currentStep = (answers: ChatAnswers): ChatStep => {
  if (!answers.template) {
    return ChatStep.TEMPLATE;
  }

  if (answers.limit === undefined) {
    return ChatStep.LIMIT;
  }

  if (answers.duration === undefined) {
    return ChatStep.DURATION;
  }

  if (answers.period === undefined) {
    return ChatStep.PERIOD;
  }

  if (answers.template.schedulable) {
    if (answers.schedule === undefined) {
      return ChatStep.SCHEDULE;
    }

    if (answers.schedule) {
      if (answers.recipient === undefined) {
        return ChatStep.RECIPIENT;
      }

      if (answers.amount === undefined) {
        return ChatStep.AMOUNT;
      }

      if (answers.delaySeconds === undefined) {
        return ChatStep.DELAY;
      }
    }
  }

  return ChatStep.CONFIRM;
};

export const scheduledSendOf = (answers: ChatAnswers): ScheduledSend | undefined =>
  answers.schedule && answers.recipient && answers.amount && answers.delaySeconds
    ? { toAddress: answers.recipient, amount: answers.amount, delaySeconds: answers.delaySeconds }
    : undefined;
