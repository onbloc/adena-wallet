import React, { ReactElement } from 'react';
import { Pressable, View } from 'react-native';

import { useThemeColors } from '../../../theme';
import { formatAddress } from '../../../utils/address';
import { Avatar, Button, Icon, Skeleton, Text } from '../../atoms';
import { PageHeading, Screen, TopBar } from '../../molecules';
import { useStyles } from './select-accounts.styles';

export interface SelectAccountOption {
  hdIndex: number;
  name: string;
  address: string;
  // Formatted native balance; undefined while loading, null when it could not be read.
  balance?: string | null;
  selected: boolean;
}

export interface SelectAccountsPageProps {
  accounts: SelectAccountOption[];
  // True while the first page of addresses is derived.
  loading: boolean;
  loadingMore: boolean;
  onToggle: (hdIndex: number) => void;
  onLoadMore: () => void;
  onSubmit: () => void;
  onBack: () => void;
}

const plural = (count: number): string => `${count} ${count === 1 ? 'account' : 'accounts'}`;

const AccountOptionRow = ({ option, onToggle }: { option: SelectAccountOption; onToggle: (hdIndex: number) => void }): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole='checkbox'
      accessibilityState={{ checked: option.selected }}
      accessibilityLabel={`${option.name}, ${option.address}`}
      onPress={() => onToggle(option.hdIndex)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      testID={`select-account-${option.hdIndex}`}
    >
      <Avatar name={option.name} size={40} />
      <View style={styles.texts}>
        <Text variant='row' numberOfLines={1}>{option.name}</Text>
        <Text variant='meta' color='secondary' numberOfLines={1} style={styles.address}>{formatAddress(option.address)}</Text>
      </View>
      <View style={styles.trailing}>
        {option.balance === undefined
          ? <Skeleton width={64} height={16} />
          : <Text variant='meta' tabular numberOfLines={1}>{option.balance ?? '—'}</Text>}
        <View style={[styles.check, option.selected ? { backgroundColor: colors.action.primary, borderColor: colors.action.primary } : { borderColor: colors.border.input }]}>
          {option.selected && <Icon name='check' size={18} color={colors.text.inverse} />}
        </View>
      </View>
    </Pressable>
  );
};

export const SelectAccountsPage = ({ accounts, loading, loadingMore, onToggle, onLoadMore, onSubmit, onBack }: SelectAccountsPageProps): ReactElement => {
  const styles = useStyles();
  const selectedCount = accounts.filter(account => account.selected).length;

  return (
    <Screen
      header={<TopBar onBack={onBack} />}
      footer={(
        <Button
          label={selectedCount > 0 ? `Import ${plural(selectedCount)}` : 'Select an account'}
          disabled={selectedCount === 0}
          onPress={onSubmit}
          testID='select-accounts-submit'
        />
      )}
    >
      <PageHeading eyebrow='Import / Select accounts' title={'Select your\naccounts.'} description='Choose which accounts you want to add to Adena.' />
      <View style={styles.list}>
        {loading
          ? [0, 1, 2].map(key => <Skeleton key={key} height={104} />)
          : accounts.map(option => <AccountOptionRow key={option.hdIndex} option={option} onToggle={onToggle} />)}
      </View>
      {!loading && (
        <>
          <Button label='Load 5 more' tone='secondary' leadingIcon='plus' loading={loadingMore} loadingLabel='Loading…' onPress={onLoadMore} testID='select-accounts-more' />
          <Text variant='meta' color='secondary' testID='select-accounts-count'>{`${plural(selectedCount)} selected`}</Text>
        </>
      )}
    </Screen>
  );
};
