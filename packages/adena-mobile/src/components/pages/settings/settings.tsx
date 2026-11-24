import React, { PropsWithChildren, ReactElement, useState } from 'react';
import { View } from 'react-native';

import { AvatarColor } from '../../../domain/account';
import { formatAddress } from '../../../utils/address';
import { Avatar, Switch, Text } from '../../atoms';
import { ListRow, Screen, SectionLabel, TopBar } from '../../molecules';
import { styles } from './settings.styles';
import { OptionSheet, SettingsOptionView, ToggleSheet } from './settings-sheets';

export type { SettingsOptionView };

export const SettingsSheet = {
  THEME: 'theme',
  CURRENCY: 'currency',
  LANGUAGE: 'language',
  BALANCES: 'balances',
} as const;

export type SettingsSheet = (typeof SettingsSheet)[keyof typeof SettingsSheet];

export interface SettingsAccountView {
  name: string;
  address: string;
  avatarColor?: AvatarColor;
  avatarPhoto?: string;
}

export interface SettingsPageProps {
  account?: SettingsAccountView;
  onOpenAccount: () => void;
  networkName: string;
  connectedAppCount: number;
  themeOptions: SettingsOptionView[];
  theme: string;
  onSelectTheme: (value: string) => void;
  currencyOptions: SettingsOptionView[];
  currency: string;
  onSelectCurrency: (value: string) => void;
  languageOptions: SettingsOptionView[];
  language: string;
  onSelectLanguage: (value: string) => void;
  hideSmallBalances: boolean;
  onToggleHideSmallBalances: (value: boolean) => void;
  hideUnknownTokens: boolean;
  onToggleHideUnknownTokens: (value: boolean) => void;
  hapticsEnabled: boolean;
  onToggleHaptics: (value: boolean) => void;
  appVersion: string;
  onOpenNetworks: () => void;
  onOpenConnectedApps: () => void;
  onOpenAddressBook: () => void;
  onOpenRecoveryPhrase: () => void;
  onOpenChangePassword: () => void;
  onLock: () => void;
  onOpenReset: () => void;
  onBack: () => void;
}

const SwitchRow = ({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }): ReactElement => (
  <View style={styles.switchRow}>
    <Text variant='row' style={styles.switchLabel}>{label}</Text>
    <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
  </View>
);

const Section = ({ label, children }: PropsWithChildren<{ label: string }>): ReactElement => {
  return (
    <View style={styles.section}>
      <SectionLabel label={label} />
      <View style={styles.rows}>{children}</View>
    </View>
  );
};

const titleOf = (options: SettingsOptionView[], value: string): string => options.find(option => option.value === value)?.title ?? value;

const codeOf = (options: SettingsOptionView[], value: string): string => options.find(option => option.value === value)?.code ?? value;

export const SettingsPage = (props: SettingsPageProps): ReactElement => {
  const [sheet, setSheet] = useState<SettingsSheet | null>(null);

  const open = (next: SettingsSheet) => (): void => setSheet(next);

  const close = (): void => setSheet(null);

  // Single-choice sheets close once a value is picked.
  const pick = (onSelect: (value: string) => void) => (value: string): void => {
    onSelect(value);
    setSheet(null);
  };

  return (
    <Screen header={<TopBar title='Settings' onBack={props.onBack} />}>
      {props.account && (
        <ListRow
          leading={<Avatar name={props.account.name} color={props.account.avatarColor} imageUri={props.account.avatarPhoto} size={40} />}
          label={props.account.name}
          description={formatAddress(props.account.address)}
          onPress={props.onOpenAccount}
        />
      )}
      <Section label='Manage'>
        <ListRow label='Networks' value={props.networkName} onPress={props.onOpenNetworks} />
        <ListRow label='Connected apps' value={String(props.connectedAppCount)} onPress={props.onOpenConnectedApps} />
        <ListRow label='Address book' onPress={props.onOpenAddressBook} />
      </Section>
      <Section label='General'>
        <ListRow label='Theme' value={titleOf(props.themeOptions, props.theme)} onPress={open(SettingsSheet.THEME)} />
        <ListRow label='Local currency' value={codeOf(props.currencyOptions, props.currency)} onPress={open(SettingsSheet.CURRENCY)} />
        <ListRow label='Language' value={titleOf(props.languageOptions, props.language)} onPress={open(SettingsSheet.LANGUAGE)} />
        <ListRow label='Balances and activity' onPress={open(SettingsSheet.BALANCES)} />
        <SwitchRow label='Haptic touch' value={props.hapticsEnabled} onChange={props.onToggleHaptics} />
      </Section>
      <Section label='Privacy and security'>
        <ListRow label='Change password' onPress={props.onOpenChangePassword} />
        <ListRow label='Recovery phrase' onPress={props.onOpenRecoveryPhrase} />
        <ListRow label='Lock wallet' onPress={props.onLock} />
        <ListRow label='Reset wallet' destructive onPress={props.onOpenReset} />
      </Section>
      <Text variant='meta' color='secondary' align='center'>{`Version ${props.appVersion}`}</Text>
      <OptionSheet
        visible={sheet === SettingsSheet.THEME}
        title='Theme'
        options={props.themeOptions}
        selected={props.theme}
        onSelect={pick(props.onSelectTheme)}
        onClose={close}
      />
      <OptionSheet
        visible={sheet === SettingsSheet.CURRENCY}
        title='Local currency'
        options={props.currencyOptions}
        selected={props.currency}
        onSelect={pick(props.onSelectCurrency)}
        onClose={close}
      />
      <OptionSheet
        visible={sheet === SettingsSheet.LANGUAGE}
        title='Language'
        options={props.languageOptions}
        selected={props.language}
        onSelect={pick(props.onSelectLanguage)}
        onClose={close}
      />
      <ToggleSheet
        visible={sheet === SettingsSheet.BALANCES}
        title='Balances and activity'
        onClose={close}
        toggles={[
          {
            key: 'hide-small',
            title: 'Hide small balances',
            description: 'Balances under 1 USD will be hidden from your portfolio.',
            value: props.hideSmallBalances,
            onChange: props.onToggleHideSmallBalances,
          },
          {
            key: 'hide-unknown',
            title: 'Hide unknown tokens',
            description: 'Potential scam tokens will be hidden from your portfolio.',
            value: props.hideUnknownTokens,
            onChange: props.onToggleHideUnknownTokens,
          },
        ]}
      />
    </Screen>
  );
};
