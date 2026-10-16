import {formatAddress} from '@common/utils/client-utils';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {HDWalletKeyring} from 'adena-module';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';

import {
  DerivedAccount,
  deriveAccounts,
  DERIVE_PAGE,
  findSeedKeyring,
  withSeedAccounts,
} from '../../core/account-import';
import {pendingSecret} from '../../core/pending-secret';
import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {colorTokens} from '../../ui/theme';
import {
  WebButton,
  WebCheckBox,
  WebErrorText,
  WebScreen,
  WebStepHeader,
  WebText,
  WebTitle,
} from '../../ui/web';

type Props = NativeStackScreenProps<MainStackParams, 'SelectImportAccounts'>;

/**
 * The web's Select Accounts step of Add Account > Import: the phrase's
 * accounts five at a time; ones already in the wallet show but can't be
 * picked. The phrase stays in pendingSecret and is dropped on leave.
 */
export function SelectImportAccountsScreen({navigation, route}: Props) {
  const {wallet, net, saveAddedAccounts} = useWallet();
  const prefix = net?.network.addressPrefix ?? 'g';
  const keyring = useRef<HDWalletKeyring | null>(null);
  const [accounts, setAccounts] = useState<DerivedAccount[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');

  useEffect(() => () => pendingSecret.clear(), []);

  const loadMore = useCallback(async () => {
    const mnemonic = pendingSecret.peekMnemonic();
    if (!wallet || !mnemonic) {
      setFailure('The seed phrase is no longer available. Start again.');
      return;
    }
    setLoading(true);
    try {
      keyring.current =
        keyring.current ??
        findSeedKeyring(wallet, mnemonic) ??
        (await HDWalletKeyring.fromMnemonic(mnemonic));
      // One at a time so each row shows as soon as it is derived (slow in
      // JavaScript on a phone).
      for (let offset = 0; offset < DERIVE_PAGE; offset++) {
        const [derived] = await deriveAccounts(
          wallet,
          keyring.current,
          prefix,
          accounts.length + offset,
          1,
        );
        setAccounts(current => [...current, derived]);
      }
    } finally {
      setLoading(false);
    }
  }, [wallet, prefix, accounts.length]);

  useEffect(() => {
    loadMore();
    // First page once; later pages on request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (hdPath: number) =>
    setSelected(current =>
      current.includes(hdPath)
        ? current.filter(item => item !== hdPath)
        : [...current, hdPath],
    );

  const add = async () => {
    const mnemonic = pendingSecret.peekMnemonic();
    if (!wallet || !mnemonic) {
      setFailure('The seed phrase is no longer available. Start again.');
      return;
    }
    setSaving(true);
    try {
      const result = await withSeedAccounts(wallet, mnemonic, selected, prefix);
      if (!result.ok) {
        setFailure('These accounts are already in the wallet.');
        return;
      }
      await saveAddedAccounts(
        result.next,
        result.added[result.added.length - 1].id,
      );
      pendingSecret.clear();
      navigation.popToTop();
    } catch {
      setFailure('Could not add the accounts. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WebScreen
      header={
        <WebStepHeader
          step={route.params.step}
          steps={route.params.steps}
          onBack={() => navigation.goBack()}
        />
      }
      footer={
        <WebButton
          testID="import-accounts-add"
          title="Next"
          chevron
          disabled={saving || loading || selected.length === 0}
          onPress={add}
        />
      }>
      <WebTitle
        title="Select Accounts"
        description="Select all accounts you wish to add to Adena."
      />
      <View style={styles.list}>
        {accounts.map(item => (
          <View key={item.hdPath} style={styles.row}>
            <View style={styles.check}>
              <WebCheckBox
                testID={`import-account-${item.hdPath}`}
                checked={item.stored || selected.includes(item.hdPath)}
                disabled={item.stored}
                onChange={() => toggle(item.hdPath)}
                label={formatAddress(item.address, 8)}
              />
            </View>
            <WebText
              type="body5"
              color={colorTokens.webNeutral._500}
              style={styles.path}>
              {item.stored ? 'Added' : `Path ${item.hdPath}`}
            </WebText>
          </View>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator color={colorTokens.webNeutral._500} />
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={loadMore}
          style={styles.more}>
          <WebText type="title5" color={colorTokens.webNeutral._300}>
            Load More Accounts
          </WebText>
        </Pressable>
      )}
      <WebErrorText>{failure}</WebErrorText>
    </WebScreen>
  );
}

const styles = StyleSheet.create({
  list: {gap: 12},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colorTokens.webNeutral._800,
  },
  check: {flex: 1},
  path: {flexShrink: 0, marginLeft: 8},
  more: {alignSelf: 'center', padding: 8},
});
