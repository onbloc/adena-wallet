import AddressBookIcon from '@assets/transfer-address-book.svg';
import GnotLogo from '@assets/gnot-logo-white.svg';
import {formatAddress, formatNickname} from '@common/utils/client-utils';
import {useFocusEffect} from '@react-navigation/native';
import WarningInfo from '@assets/warning-info.svg';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import BigNumber from 'bignumber.js';
import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';

import {isAddressForNetwork} from '../core/address';
import {RecipientCandidate, recipientCandidates} from '../core/address-book';
import {parseGnotToUgnot} from '../core/format';
import {useWallet} from '../core/wallet-context';
import type {MainStackParams} from '../navigation/types';
import {ButtonPair, Screen} from '../ui/components';
import {colors, colorTokens, fonts} from '../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'Send'>;

/** The extension's transfer input: logo, recipient, amount, memo. */
export function SendScreen({navigation, route}: Props) {
  const {base, net, address, wallet} = useWallet();
  const [to, setTo] = useState('');
  const [candidates, setCandidates] = useState<RecipientCandidate[]>([]);
  const [bookOpen, setBookOpen] = useState(false);
  const [picked, setPicked] = useState<RecipientCandidate | null>(null);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<{
    field: 'to' | 'amount';
    message: string;
  } | null>(null);

  useEffect(() => {
    const scanned = route.params?.scannedAddress;
    if (scanned) {
      setTo(scanned);
    }
  }, [route.params?.scannedAddress]);

  useEffect(() => {
    if (net && address) {
      net.balanceService
        .getGnotTokenBalance(address)
        .then(setBalance)
        .catch(() => setBalance(null));
    }
  }, [net, address]);

  const prefix = net?.network.addressPrefix ?? 'g';

  // Reloaded on focus: an address saved from Settings shows up on return.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const book = await base.addressBookService
          .getAddressBook()
          .catch(() => []);
        const list = await recipientCandidates(
          book,
          wallet?.accounts ?? [],
          prefix,
          address,
        );
        if (!cancelled) {
          setCandidates(list);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [base, wallet, prefix, address]),
  );

  const pick = (candidate: RecipientCandidate) => {
    setTo(candidate.address);
    setPicked(candidate);
    setBookOpen(false);
    setError(null);
  };

  const next = () => {
    const recipient = to.trim();
    if (!isAddressForNetwork(recipient, prefix)) {
      setError({field: 'to', message: 'Invalid address'});
      return;
    }
    if (recipient === address) {
      setError({field: 'to', message: 'This is your own address.'});
      return;
    }
    const ugnot = parseGnotToUgnot(amount);
    if (!ugnot) {
      setError({
        field: 'amount',
        message: 'Enter an amount greater than 0 with at most 6 decimals.',
      });
      return;
    }
    if (balance !== null && BigNumber(amount).gt(balance)) {
      setError({field: 'amount', message: 'Insufficient balance'});
      return;
    }
    navigation.navigate('SendConfirm', {
      to: recipient,
      ugnot,
      memo: memo.trim(),
    });
  };

  return (
    <Screen
      footer={
        <ButtonPair
          cancel={{title: 'Cancel', onPress: () => navigation.goBack()}}
          confirm={{
            title: 'Next',
            testID: 'send-next',
            disabled: !to || !amount,
            onPress: next,
          }}
        />
      }>
      <View style={styles.logo}>
        <GnotLogo width={64} height={64} />
      </View>
      <View style={styles.group}>
        <View style={[styles.box, error?.field === 'to' && styles.boxError]}>
          <TextInput
            {...INPUT_PROPS}
            accessibilityLabel="Recipient address"
            placeholder={`Recipient’s ${
              net?.network.networkName ?? ''
            } Address`}
            value={to}
            onChangeText={text => {
              setTo(text);
              setPicked(null);
              setError(null);
            }}
            multiline
            style={styles.input}
          />
          <Pressable
            testID="send-address-book"
            accessibilityRole="button"
            accessibilityLabel="Address book"
            accessibilityState={{expanded: bookOpen}}
            hitSlop={6}
            onPress={() => setBookOpen(open => !open)}
            style={({pressed}) => [styles.pill, pressed && styles.pillPressed]}>
            <AddressBookIcon width={16} height={16} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('QrScan')}
            style={({pressed}) => [styles.pill, pressed && styles.pillPressed]}>
            <Text style={styles.pillText}>Scan</Text>
          </Pressable>
        </View>
        {picked && picked.address === to && (
          <Text style={styles.pickedText}>
            {picked.own ? 'My account' : 'Address book'}:{' '}
            {formatNickname(picked.name, 20)}
          </Text>
        )}
        {bookOpen && (
          <View style={styles.book}>
            {candidates.length === 0 ? (
              <Text style={styles.bookEmpty}>No saved addresses</Text>
            ) : (
              candidates.map(candidate => (
                <Pressable
                  key={candidate.id}
                  accessibilityRole="button"
                  onPress={() => pick(candidate)}
                  style={({pressed}) => [
                    styles.bookRow,
                    pressed && styles.bookRowPressed,
                  ]}>
                  <Text style={styles.bookName} numberOfLines={1}>
                    {formatNickname(candidate.name, 12)}
                  </Text>
                  <Text style={styles.bookAddress}>
                    ({formatAddress(candidate.address)})
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        )}
        {error?.field === 'to' && (
          <Text style={styles.errorText}>{error.message}</Text>
        )}
      </View>
      <View style={styles.group}>
        <View
          style={[styles.box, error?.field === 'amount' && styles.boxError]}>
          <TextInput
            {...INPUT_PROPS}
            accessibilityLabel="Amount"
            placeholder="Amount"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={text => {
              setAmount(text);
              setError(null);
            }}
            style={styles.input}
          />
          <Text style={styles.unit}>GNOT</Text>
        </View>
        <Text
          style={[
            styles.caption,
            error?.field === 'amount' && styles.captionError,
          ]}>
          {error?.field === 'amount'
            ? error.message
            : `Balance: ${
                balance === null ? '-' : BigNumber(balance).toFormat()
              } GNOT`}
        </Text>
      </View>
      <View style={styles.group}>
        <View style={styles.box}>
          <TextInput
            {...INPUT_PROPS}
            accessibilityLabel="Memo"
            placeholder="Memo (Optional)"
            value={memo}
            onChangeText={setMemo}
            multiline
            style={styles.input}
          />
        </View>
        <View style={styles.memoNotice}>
          <WarningInfo width={14} height={14} />
          <Text style={styles.memoNoticeText}>
            A memo is required when sending tokens to a centralized exchange. It
            is public on chain.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

/** Same keyboard hardening as Field: nothing typed is learned or suggested. */
const INPUT_PROPS = {
  autoCapitalize: 'none',
  autoCorrect: false,
  autoComplete: 'off',
  spellCheck: false,
  importantForAutofill: 'no',
  keyboardAppearance: 'dark',
  placeholderTextColor: colors.textMuted,
  selectionColor: colors.primary,
} as const;

const {neutral, red} = colorTokens;

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: neutral._7,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  group: {gap: 6},
  box: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: neutral._9,
    borderWidth: 1,
    borderColor: neutral._7,
    borderRadius: 30,
  },
  boxError: {borderColor: red._5},
  input: {
    ...fonts.body2Reg,
    flex: 1,
    color: colors.text,
    paddingVertical: 4,
  },
  pill: {
    height: 25,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: neutral._7,
    justifyContent: 'center',
  },
  pillPressed: {backgroundColor: neutral.b},
  pillText: {...fonts.body3Bold, lineHeight: 16, color: colors.text},
  pickedText: {...fonts.captionReg, color: colors.textMuted, paddingHorizontal: 16},
  book: {
    borderRadius: 18,
    backgroundColor: neutral._9,
    borderWidth: 1,
    borderColor: neutral._7,
    overflow: 'hidden',
  },
  bookEmpty: {...fonts.body2Reg, color: colors.textMuted, padding: 16},
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bookRowPressed: {backgroundColor: neutral._7},
  bookName: {...fonts.body2Bold, color: colors.text, flexShrink: 1},
  bookAddress: {...fonts.body2Reg, color: colors.textMuted},
  unit: {...fonts.body2Reg, color: colors.text},
  caption: {
    ...fonts.captionReg,
    color: colors.textMuted,
    paddingHorizontal: 16,
    textAlign: 'right',
  },
  captionError: {color: red._5, textAlign: 'left'},
  errorText: {...fonts.captionReg, color: red._5, paddingHorizontal: 16},
  memoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.05)',
  },
  memoNoticeText: {...fonts.body2Reg, color: red._8, flex: 1},
});
