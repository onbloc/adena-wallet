import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useMemo, useState } from 'react';

import { CardChatPage, ChatMessageView, ChatOptionView } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import {
  cardTemplates,
  ChatAnswers,
  ChatStep,
  currentStep,
  durationChoices,
  LIMIT_CHOICES,
  periodChoices,
  SCHEDULE_DELAYS_SECONDS,
  scheduleAmountChoices,
  scheduledSendOf,
} from '../../../domain/card-template';
import { CardPermissionKind, formatDuration, formatSpendPeriod } from '../../../domain/session-card';
import { useCardTransaction } from '../../../hooks/use-reviewed-transaction';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { toIssueReview } from '../../../presenters/session-card.presenter';
import { formatAddress } from '../../../utils/address';
import { formatTokenAmount, toBaseUnit } from '../../../utils/amount';

const ENTER_ADDRESS = 'enter-address';
const ISSUE = 'issue';
const RESTART = 'restart';
const YES = 'yes';
const NO = 'no';

const QUESTIONS: Record<ChatStep, string> = {
  template: 'What should this card do?',
  limit: 'How much can it spend, fees included?',
  duration: 'How long should it work?',
  period: 'Should the limit reset?',
  schedule: 'Should it send GNOT by itself after a short delay?',
  recipient: 'Who should receive it?',
  amount: 'How much should it send?',
  delay: 'When should it send?',
  confirm: 'Issue this card?',
};

// The answered question, shown as a done step above the user's answer.
const DONE: Record<Exclude<ChatStep, 'confirm'>, string> = {
  template: 'What it does',
  limit: 'Spending limit',
  duration: 'How long it works',
  period: 'Limit reset',
  schedule: 'Send by itself',
  recipient: 'Recipient',
  amount: 'Amount to send',
  delay: 'When to send',
};

const TEMPLATE_ICONS = { send: 'arrowUp', trade: 'swap', orders: 'repeat' } as const;

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

export const CardChatScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'CardCreate'>): ReactElement => {
  const { sessionCardService, swapService, orderService, accountService, chainRegistry } = useContainer();
  const { account, accounts, network } = useWalletSnapshot();
  const { decimals, symbol } = network.nativeToken;
  const [answers, setAnswers] = useState<ChatAnswers>({});
  const [addressInput, setAddressInput] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string>();
  const [tokenRealms, setTokenRealms] = useState<string[]>([]);
  const issue = useCardTransaction('Card issued', () => navigation.goBack());
  const chain = chainRegistry.forNetwork(network);

  const templates = useMemo(() => {
    const swap = swapService.getSwapConfig(network);
    const orders = orderService.getOrderConfig(network);

    return cardTemplates({ routerPath: swap?.routerPath, wrappedNativePackagePath: swap?.wrappedNative.packagePath, dcaPath: orders?.dcaPath, limitPath: orders?.limitPath });
  }, [network, orderService, swapService]);

  const step = currentStep(answers);
  const gnot = (raw: string): string => `${formatTokenAmount(raw, decimals)} ${symbol}`;
  const otherAccounts = accounts.filter(item => item.id !== account?.id).map(item => ({ name: item.name, address: accountService.getAddress(item, network) }));

  const optionsFor = (current: ChatStep): ChatOptionView[] => {
    switch (current) {
      case ChatStep.TEMPLATE:
        return templates.map(template => ({ key: template.id, label: template.label, description: template.description, icon: TEMPLATE_ICONS[template.id] }));
      case ChatStep.LIMIT:
        return LIMIT_CHOICES.map(choice => ({ key: toBaseUnit(choice, decimals), label: `${choice} ${symbol}` }));
      case ChatStep.DURATION:
        return durationChoices().map(duration => ({ key: String(duration), label: formatDuration(duration) }));
      case ChatStep.PERIOD:
        return periodChoices(answers.duration ?? 0).map(period => ({ key: String(period), label: formatSpendPeriod(period) }));
      case ChatStep.SCHEDULE:
        return [{ key: YES, label: 'Yes, schedule a send', icon: 'clock' }, { key: NO, label: 'No, just issue the card' }];
      case ChatStep.RECIPIENT:
        return addressInput !== null
          ? []
          : [
              ...otherAccounts.map(item => ({ key: item.address, label: item.name, description: formatAddress(item.address, 6), icon: 'user' as const })),
              { key: ENTER_ADDRESS, label: 'Enter an address', icon: 'qrCode' as const },
            ];
      case ChatStep.AMOUNT:
        return scheduleAmountChoices(answers.limit ?? '0', decimals).map(choice => ({ key: toBaseUnit(choice, decimals), label: `${choice} ${symbol}` }));
      case ChatStep.DELAY:
        return SCHEDULE_DELAYS_SECONDS.filter(delay => delay < (answers.duration ?? 0)).map(delay => ({ key: String(delay), label: `In ${delay} seconds` }));
      case ChatStep.CONFIRM:
        return [{ key: ISSUE, label: 'Review and issue', description: summary(), icon: 'card' }, { key: RESTART, label: 'Start over' }];
    }
  };

  const summary = (): string => {
    const schedule = scheduledSendOf(answers);
    const parts = [
      `“${answers.template?.defaultName}” · up to ${gnot(answers.limit ?? '0')} ${formatSpendPeriod(answers.period ?? 0).toLowerCase()}`,
      `for ${formatDuration(answers.duration ?? 0)}`,
      ...(schedule ? [`then sends ${gnot(schedule.amount)} in ${schedule.delaySeconds}s`] : []),
    ];

    return parts.join(', ');
  };

  // Each answered question becomes a done step followed by the user's answer.
  const messages = ((): ChatMessageView[] => {
    const thread: ChatMessageView[] = [];
    const answer = (id: Exclude<ChatStep, 'confirm'>, text: string): void => {
      thread.push({ id: `q-${id}`, from: 'bot', text: DONE[id] }, { id: `a-${id}`, from: 'user', text });
    };

    if (answers.template) {
      answer(ChatStep.TEMPLATE, answers.template.label);
    }

    if (answers.limit !== undefined) {
      answer(ChatStep.LIMIT, gnot(answers.limit));
    }

    if (answers.duration !== undefined) {
      answer(ChatStep.DURATION, formatDuration(answers.duration));
    }

    if (answers.period !== undefined) {
      answer(ChatStep.PERIOD, formatSpendPeriod(answers.period));
    }

    if (answers.schedule !== undefined) {
      answer(ChatStep.SCHEDULE, answers.schedule ? 'Yes, schedule a send' : 'No, just issue the card');
    }

    if (answers.recipient !== undefined) {
      answer(ChatStep.RECIPIENT, formatAddress(answers.recipient, 8));
    }

    if (answers.amount !== undefined) {
      answer(ChatStep.AMOUNT, gnot(answers.amount));
    }

    if (answers.delaySeconds !== undefined) {
      answer(ChatStep.DELAY, `In ${answers.delaySeconds} seconds`);
    }

    return thread;
  })();

  const start = (): void => {
    const { template, limit, duration, period } = answers;

    if (!account || !template || limit === undefined || duration === undefined || period === undefined) {
      return;
    }

    const policy = { name: template.defaultName, permissions: template.permissions, spendLimit: limit, spendPeriod: period, duration };
    const realms = template.permissions.flatMap(permission => (permission.kind === CardPermissionKind.REALM ? [permission.path] : []));

    issue.start(async () => {
      // Checked before review: a realm that can move tokens is not capped by the GNOT limit.
      const inspections = await Promise.all(realms.map(path => sessionCardService.inspectRealm(path, network)));

      setTokenRealms(inspections.flatMap(inspection => inspection.tokenRealms));
      return sessionCardService.prepareIssue(account, network, policy, scheduledSendOf(answers));
    });
  };

  const restart = (): void => {
    setAnswers({});
    setAddressInput(null);
    setAddressError(undefined);
  };

  const handleSelect = (key: string): void => {
    switch (step) {
      case ChatStep.TEMPLATE:
        setAnswers({ template: templates.find(template => template.id === key) });
        return;
      case ChatStep.LIMIT:
        setAnswers(current => ({ ...current, limit: key }));
        return;
      case ChatStep.DURATION:
        setAnswers(current => ({ ...current, duration: Number(key) as never }));
        return;
      case ChatStep.PERIOD:
        setAnswers(current => ({ ...current, period: Number(key) as never }));
        return;
      case ChatStep.SCHEDULE:
        setAnswers(current => ({ ...current, schedule: key === YES }));
        return;
      case ChatStep.RECIPIENT:
        if (key === ENTER_ADDRESS) {
          setAddressInput('');
          return;
        }

        setAnswers(current => ({ ...current, recipient: key }));
        return;
      case ChatStep.AMOUNT:
        setAnswers(current => ({ ...current, amount: key }));
        return;
      case ChatStep.DELAY:
        setAnswers(current => ({ ...current, delaySeconds: Number(key) }));
        return;
      case ChatStep.CONFIRM:
        if (key === ISSUE) {
          start();
          return;
        }

        restart();
    }
  };

  const handleSubmitAddress = (): void => {
    const address = chain.normalizeAddress((addressInput ?? '').trim(), network);

    if (!address) {
      setAddressError('Enter a valid address');
      return;
    }

    setAnswers(current => ({ ...current, recipient: address }));
    setAddressInput(null);
    setAddressError(undefined);
  };

  const handleChangeAddress = (value: string): void => {
    setAddressInput(value);
    setAddressError(undefined);
  };

  const prepared = issue.prepared;

  return (
    <CardChatPage
      stage={step !== ChatStep.CONFIRM ? 0 : issue.prepared ? 2 : 1}
      messages={messages}
      question={QUESTIONS[step]}
      options={optionsFor(step)}
      onSelect={handleSelect}
      input={step === ChatStep.RECIPIENT && addressInput !== null
        ? { label: 'Address', placeholder: 'g1…', value: addressInput, error: addressError, onChange: handleChangeAddress, onSubmit: handleSubmitAddress }
        : undefined}
      onBack={navigation.goBack}
      onRestart={restart}
      canRestart={step !== ChatStep.TEMPLATE}
      preparing={issue.preparing}
      error={issue.prepareError ?? issue.notice}
      review={{
        review: prepared?.policy
          ? { ...toIssueReview(prepared.policy, tokenRealms, network, nowSeconds(), prepared.schedule), fee: issue.fee }
          : undefined,
        confirming: issue.confirming,
        error: issue.confirmError,
        onConfirm: issue.confirm,
        onClose: issue.close,
      }}
    />
  );
};
