import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Chip, IconButton, Spinner, Switch, Text } from '../../atoms';
import { InlineAlert, Screen, SectionLabel, TextField, TopBar } from '../../molecules';
import { CardReviewSheet, CardReviewSheetProps } from '../cards/card-review-sheet';
import { useStyles } from './card-create.styles';

export const CardCreateStep = {
  WHERE: 'where',
  LIMIT: 'limit',
  UNTIL: 'until',
  NAME: 'name',
} as const;

export type CardCreateStep = (typeof CardCreateStep)[keyof typeof CardCreateStep];

export const CARD_CREATE_STEPS: CardCreateStep[] = Object.values(CardCreateStep);

const STEP_TITLES: Record<CardCreateStep, { title: string; description: string }> = {
  where: { title: 'Where can it act?', description: 'The card can only call the realms you add here, and the packages below them.' },
  limit: { title: 'How much can it spend?', description: 'Network fees come out of this limit too.' },
  until: { title: 'Until when?', description: 'The card stops working on its own at this time. Shorter is safer.' },
  name: { title: 'Name the card', description: 'Only you see this name. It stays on this device.' },
};

export interface CardRealmView {
  path: string;
  checking: boolean;
  description?: string;
  warning?: string;
  error?: string;
}

export interface CardOptionView<T extends string | number> {
  key: T;
  label: string;
  selected: boolean;
  disabled?: boolean;
}

export interface CardCreatePageProps {
  step: CardCreateStep;
  onBack: () => void;
  // Where
  realms: CardRealmView[];
  realmInput: string;
  realmInputError?: string;
  suggestions: string[];
  canAddRealm: boolean;
  onChangeRealmInput: (value: string) => void;
  onAddRealm: () => void;
  onSelectSuggestion: (path: string) => void;
  onRemoveRealm: (path: string) => void;
  allowSend: boolean;
  onToggleSend: (next: boolean) => void;
  permissionsNotice?: string;
  // Limit
  amount: string;
  amountError?: string;
  symbol: string;
  onChangeAmount: (value: string) => void;
  periods: CardOptionView<number>[];
  onSelectPeriod: (period: number) => void;
  // Until
  durations: CardOptionView<number>[];
  onSelectDuration: (duration: number) => void;
  untilCaption: string;
  durationNotice?: string;
  // Name
  name: string;
  nameError?: string;
  onChangeName: (value: string) => void;
  // Footer
  canContinue: boolean;
  preparing: boolean;
  error?: string;
  onContinue: () => void;
  review: CardReviewSheetProps;
}

const WhereStep = (props: CardCreatePageProps): ReactElement => {
  const styles = useStyles();

  return (
    <View style={styles.section}>
      <View style={styles.inputRow}>
        <View style={styles.input}>
          <TextField
            label='Realm path'
            placeholder='gno.land/r/…'
            value={props.realmInput}
            error={props.realmInputError}
            autoCapitalize='none'
            autoCorrect={false}
            onChangeText={props.onChangeRealmInput}
            onSubmitEditing={props.onAddRealm}
            returnKeyType='done'
            testID='card-realm-input'
          />
        </View>
        <Button label='Add' size='compact' fullWidth={false} disabled={!props.canAddRealm} onPress={props.onAddRealm} testID='card-realm-add' />
      </View>
      {props.suggestions.length > 0 && (
        <View style={styles.chips}>
          {props.suggestions.map((path) => {
            const handlePress = (): void => props.onSelectSuggestion(path);

            return <Chip key={path} label={path} onPress={handlePress} />;
          })}
        </View>
      )}
      {props.realms.map((realm) => {
        const handleRemove = (): void => props.onRemoveRealm(realm.path);

        return (
          <View key={realm.path} style={styles.realm} testID={`card-realm-${realm.path}`}>
            <View style={styles.realmText}>
              <Text variant='row' numberOfLines={2}>{realm.path}</Text>
              {realm.checking && (
                <View style={styles.checking}>
                  <Spinner size={14} />
                  <Text variant='meta' color='secondary'>Checking the code…</Text>
                </View>
              )}
              {realm.description && <Text variant='meta' color='secondary'>{realm.description}</Text>}
              {realm.warning && <Text variant='meta' color='warning'>{realm.warning}</Text>}
              {realm.error && <Text variant='meta' color='error'>{realm.error}</Text>}
            </View>
            <IconButton icon='trash' accessibilityLabel={`Remove ${realm.path}`} onPress={handleRemove} />
          </View>
        );
      })}
      <View style={styles.toggleRow}>
        <View style={styles.realmText}>
          <Text variant='row'>Send GNOT</Text>
          <Text variant='meta' color='secondary'>Lets the card send GNOT to any address, up to its limit.</Text>
        </View>
        <Switch value={props.allowSend} onValueChange={props.onToggleSend} accessibilityLabel='Allow sending GNOT' />
      </View>
      {props.permissionsNotice && <InlineAlert tone='warning' title={props.permissionsNotice} />}
    </View>
  );
};

const LimitStep = (props: CardCreatePageProps): ReactElement => {
  const styles = useStyles();

  return (
    <View style={styles.section}>
      <TextField
        label={`Limit (${props.symbol})`}
        placeholder='0'
        value={props.amount}
        error={props.amountError}
        keyboardType='decimal-pad'
        returnKeyType='done'
        onChangeText={props.onChangeAmount}
        testID='card-amount-input'
      />
      <SectionLabel label='Resets' />
      <View style={styles.chips}>
        {props.periods.map((period) => {
          const handlePress = (): void => props.onSelectPeriod(period.key);

          return <Chip key={period.key} label={period.label} selected={period.selected} disabled={period.disabled} onPress={handlePress} />;
        })}
      </View>
    </View>
  );
};

const UntilStep = (props: CardCreatePageProps): ReactElement => {
  const styles = useStyles();

  return (
    <View style={styles.section}>
      <View style={styles.chips}>
        {props.durations.map((duration) => {
          const handlePress = (): void => props.onSelectDuration(duration.key);

          return <Chip key={duration.key} label={duration.label} selected={duration.selected} disabled={duration.disabled} onPress={handlePress} />;
        })}
      </View>
      <Text variant='meta' color='secondary'>{props.untilCaption}</Text>
      {props.durationNotice && <InlineAlert tone='info' title={props.durationNotice} />}
    </View>
  );
};

const NameStep = (props: CardCreatePageProps): ReactElement => (
  <TextField label='Card name' value={props.name} error={props.nameError} onChangeText={props.onChangeName} maxLength={24} returnKeyType='done' testID='card-name-input' />
);

const STEP_BODIES: Record<CardCreateStep, (props: CardCreatePageProps) => ReactElement> = {
  where: WhereStep,
  limit: LimitStep,
  until: UntilStep,
  name: NameStep,
};

export const CardCreatePage = (props: CardCreatePageProps): ReactElement => {
  const styles = useStyles();
  const index = CARD_CREATE_STEPS.indexOf(props.step);
  const last = index === CARD_CREATE_STEPS.length - 1;
  const { title, description } = STEP_TITLES[props.step];
  const Body = STEP_BODIES[props.step];

  return (
    <Screen
      header={<TopBar title='New card' onBack={props.onBack} />}
      footer={(
        <View style={styles.footer}>
          {props.error && <InlineAlert tone='error' title={props.error} />}
          <Button
            label={last ? 'Review' : 'Next'}
            disabled={!props.canContinue}
            loading={props.preparing}
            loadingLabel='Preparing…'
            onPress={props.onContinue}
            testID='card-continue'
          />
        </View>
      )}
    >
      <View style={styles.heading}>
        <Text variant='meta' color='secondary'>{`Step ${index + 1} of ${CARD_CREATE_STEPS.length}`}</Text>
        <Text variant='section'>{title}</Text>
        <Text variant='meta' color='secondary'>{description}</Text>
      </View>
      <Body {...props} />
      <CardReviewSheet {...props.review} />
    </Screen>
  );
};
