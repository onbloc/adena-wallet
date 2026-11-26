import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect, useMemo, useRef, useState } from 'react';

import { CARD_CREATE_STEPS, CardCreatePage, CardCreateStep, CardRealmView } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import {
  CARD_DURATIONS,
  CARD_NAME_MAX_LENGTH,
  CardDuration,
  CardPermissionKind,
  CardPolicy,
  coversPath,
  DEFAULT_CARD_DURATION,
  formatDuration,
  formatExpiry,
  formatSpendPeriod,
  IssuablePermission,
  MAX_TOKEN_REALM_LOOKUPS,
  normalizeRealmPath,
  realmPathError,
  SESSION_MAX_ALLOW_PATHS,
  SPEND_PERIODS,
  SpendPeriod,
  validateCardPolicy,
} from '../../../domain/session-card';
import { useCardTransaction } from '../../../hooks/use-reviewed-transaction';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { toIssueReview } from '../../../presenters/session-card.presenter';
import { useSessionCardsQuery } from '../../../queries/session-card.queries';
import { RealmInspection } from '../../../services/session-card.service';
import { isPositiveAmount, toBaseUnit } from '../../../utils/amount';

interface RealmEntry {
  path: string;
  inspection?: RealmInspection;
  error?: string;
}

const DECIMAL_INPUT = /^\d*(?:\.\d*)?$/;

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

export const CardCreateScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'CardCreate'>): ReactElement => {
  const { sessionCardService, swapService } = useContainer();
  const { account, network } = useWalletSnapshot();
  const existing = useSessionCardsQuery(account, network);
  const decimals = network.nativeToken.decimals;

  const [step, setStep] = useState<CardCreateStep>(CardCreateStep.WHERE);
  const [realms, setRealms] = useState<RealmEntry[]>([]);
  const [realmInput, setRealmInput] = useState('');
  const [realmInputError, setRealmInputError] = useState<string>();
  const [allowSend, setAllowSend] = useState(false);
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<SpendPeriod>(SpendPeriod.TOTAL);
  const [duration, setDuration] = useState<CardDuration>(DEFAULT_CARD_DURATION);
  const [name, setName] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => (): void => {
    mountedRef.current = false;
  }, []);

  // Suggested once the account's card count is known, and only while the user has not typed one.
  const defaultName = `Card ${(existing.data?.length ?? 0) + 1}`;
  const cardName = name || defaultName;

  const issue = useCardTransaction('Card issued', () => navigation.goBack());

  const permissions: IssuablePermission[] = useMemo(() => [
    ...realms.map(realm => ({ kind: CardPermissionKind.REALM, path: realm.path }) as const),
    ...(allowSend ? [{ kind: CardPermissionKind.SEND } as const] : []),
  ], [realms, allowSend]);

  const spendLimit = isPositiveAmount(amount) ? toBaseUnit(amount, decimals) : '0';
  const policy: CardPolicy = { name: cardName, permissions, spendLimit, spendPeriod: period, duration };
  const errors = validateCardPolicy(policy);
  const inspecting = realms.some(realm => !realm.inspection && !realm.error);
  const realmFailed = realms.some(realm => realm.error);
  const atCapacity = permissions.length >= SESSION_MAX_ALLOW_PATHS;

  const suggestions = useMemo(() => {
    const router = swapService.getSwapConfig(network)?.routerPath;

    return router && !realms.some(realm => coversPath(realm.path, router)) ? [router] : [];
  }, [network, realms, swapService]);

  const inspect = (path: string): void => {
    sessionCardService.inspectRealm(path, network).then(
      (inspection) => {
        if (mountedRef.current) {
          setRealms(current => current.map(realm => (realm.path === path ? { path, inspection } : realm)));
        }
      },
      (error) => {
        if (mountedRef.current) {
          setRealms(current => current.map(realm => (realm.path === path ? { path, error: toErrorMessage(error) } : realm)));
        }
      },
    );
  };

  const addRealm = (input: string): void => {
    const path = normalizeRealmPath(input);
    const invalid = realmPathError(path);
    const covering = realms.find(realm => coversPath(realm.path, path));

    if (invalid) {
      setRealmInputError(invalid);
      return;
    }

    if (covering) {
      setRealmInputError(covering.path === path ? 'Already added' : `Already covered by ${covering.path}`);
      return;
    }

    // A broader entry replaces the narrower ones it covers.
    const kept = realms.filter(realm => !coversPath(path, realm.path));

    if (kept.length + (allowSend ? 1 : 0) >= SESSION_MAX_ALLOW_PATHS) {
      setRealmInputError(`A card can have up to ${SESSION_MAX_ALLOW_PATHS} entries`);
      return;
    }

    setRealms([...kept, { path }]);
    setRealmInput('');
    setRealmInputError(undefined);
    inspect(path);
  };

  const realmViews: CardRealmView[] = realms.map((realm) => {
    const { inspection } = realm;
    const opened = inspection?.realms.length ?? 0;

    return {
      path: realm.path,
      checking: !inspection && !realm.error,
      error: realm.error,
      description: inspection ? (opened === 1 && inspection.realms[0] === realm.path ? 'Realm found' : `Opens ${opened} realms`) : undefined,
      warning: inspection && inspection.tokenRealms.length > 0
        ? `Can move your tokens: ${inspection.tokenRealms.join(', ')}`
        : inspection && opened > MAX_TOKEN_REALM_LOOKUPS ? `Only the first ${MAX_TOKEN_REALM_LOOKUPS} realms were checked for token access` : undefined,
    };
  });

  const tokenRealms = realms.flatMap(realm => realm.inspection?.tokenRealms ?? []);

  const canContinue = ((): boolean => {
    switch (step) {
      case CardCreateStep.WHERE:
        return permissions.length > 0 && !inspecting && !realmFailed && !errors.includes('tooManyPermissions');
      case CardCreateStep.LIMIT:
        return !errors.includes('spendLimit');
      case CardCreateStep.UNTIL:
        return !errors.includes('spendPeriod');
      case CardCreateStep.NAME:
        return errors.length === 0 && issue.canSend;
    }
  })();

  const handleContinue = (): void => {
    const index = CARD_CREATE_STEPS.indexOf(step);

    if (index < CARD_CREATE_STEPS.length - 1) {
      setStep(CARD_CREATE_STEPS[index + 1]);
      return;
    }

    if (account) {
      issue.start(() => sessionCardService.prepareIssue(account, network, policy));
    }
  };

  const handleBack = (): void => {
    const index = CARD_CREATE_STEPS.indexOf(step);

    if (index === 0) {
      navigation.goBack();
      return;
    }

    setStep(CARD_CREATE_STEPS[index - 1]);
  };

  const handleChangeRealmInput = (value: string): void => {
    setRealmInput(value);
    setRealmInputError(undefined);
  };

  const handleAddRealm = (): void => addRealm(realmInput);

  const handleRemoveRealm = (path: string): void => setRealms(current => current.filter(realm => realm.path !== path));

  const handleToggleSend = (next: boolean): void => setAllowSend(next && (!atCapacity || allowSend));

  const handleChangeAmount = (value: string): void => {
    const normalized = value.replace(',', '.');

    if (DECIMAL_INPUT.test(normalized) && (normalized.split('.')[1]?.length ?? 0) <= decimals) {
      setAmount(normalized);
    }
  };

  const handleSelectPeriod = (value: number): void => setPeriod(value as SpendPeriod);

  const handleSelectDuration = (value: number): void => setDuration(value as CardDuration);

  const handleChangeName = (value: string): void => setName(value.slice(0, CARD_NAME_MAX_LENGTH));

  const stepError = issue.prepareError ?? issue.notice;

  return (
    <CardCreatePage
      step={step}
      onBack={handleBack}
      realms={realmViews}
      realmInput={realmInput}
      realmInputError={realmInputError}
      suggestions={suggestions}
      canAddRealm={realmInput.trim().length > 0 && !atCapacity}
      onChangeRealmInput={handleChangeRealmInput}
      onAddRealm={handleAddRealm}
      onSelectSuggestion={addRealm}
      onRemoveRealm={handleRemoveRealm}
      allowSend={allowSend}
      onToggleSend={handleToggleSend}
      permissionsNotice={atCapacity ? `A card can have up to ${SESSION_MAX_ALLOW_PATHS} entries` : undefined}
      amount={amount}
      amountError={amount && !isPositiveAmount(amount) ? 'Enter an amount greater than zero' : undefined}
      symbol={network.nativeToken.symbol}
      onChangeAmount={handleChangeAmount}
      periods={SPEND_PERIODS.map(value => ({ key: value, label: formatSpendPeriod(value), selected: value === period }))}
      onSelectPeriod={handleSelectPeriod}
      durations={CARD_DURATIONS.map(value => ({ key: value, label: formatDuration(value), selected: value === duration, disabled: value < period }))}
      onSelectDuration={handleSelectDuration}
      untilCaption={`Ends about ${formatExpiry(nowSeconds() + duration)}`}
      durationNotice={errors.includes('spendPeriod') ? `The card must last at least as long as its reset period (${formatSpendPeriod(period).toLowerCase()}).` : undefined}
      name={name}
      onChangeName={handleChangeName}
      canContinue={canContinue}
      preparing={issue.preparing}
      error={step === CardCreateStep.NAME ? stepError : undefined}
      onContinue={handleContinue}
      review={{
        review: issue.prepared?.policy
          ? { ...toIssueReview(issue.prepared.policy, tokenRealms, network, nowSeconds()), fee: issue.fee }
          : undefined,
        confirming: issue.confirming,
        error: issue.confirmError,
        onConfirm: issue.confirm,
        onClose: issue.close,
      }}
    />
  );
};
