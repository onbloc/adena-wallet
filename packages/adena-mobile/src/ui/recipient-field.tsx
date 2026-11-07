import AddressBookIcon from '@assets/transfer-address-book.svg';
import {formatAddress, formatNickname} from '@common/utils/client-utils';
import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';

import {RecipientCandidate, recipientCandidates} from '../core/address-book';
import {useWallet} from '../core/wallet-context';
import {formBox, INPUT_PROPS} from './form-box';
import {colors, colorTokens, fonts} from './theme';

/**
 * The transfer recipient box: typed or pasted address, the address-book list
 * (the wallet's other accounts and saved addresses on this chain), and Scan.
 */
export function RecipientField({
  value,
  onChange,
  error,
  onScan,
}: {
  value: string;
  onChange: (address: string) => void;
  error?: string | null;
  onScan: () => void;
}) {
  const {base, net, address, wallet, accountNames} = useWallet();
  const [candidates, setCandidates] = useState<RecipientCandidate[]>([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<RecipientCandidate | null>(null);
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
          accountNames,
        );
        if (!cancelled) {
          setCandidates(list);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [base, wallet, prefix, address, accountNames]),
  );

  return (
    <View style={formBox.group}>
      <View style={[formBox.box, !!error && formBox.boxError]}>
        <TextInput
          {...INPUT_PROPS}
          accessibilityLabel="Recipient address"
          placeholder={`Recipient’s ${net?.network.networkName ?? ''} Address`}
          value={value}
          onChangeText={text => {
            setPicked(null);
            onChange(text);
          }}
          multiline
          style={formBox.input}
        />
        <Pressable
          testID="send-address-book"
          accessibilityRole="button"
          accessibilityLabel="Address book"
          accessibilityState={{expanded: open}}
          hitSlop={6}
          onPress={() => setOpen(current => !current)}
          style={({pressed}) => [formBox.pill, pressed && formBox.pillPressed]}>
          <AddressBookIcon width={16} height={16} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onScan}
          style={({pressed}) => [formBox.pill, pressed && formBox.pillPressed]}>
          <Text style={formBox.pillText}>Scan</Text>
        </Pressable>
      </View>
      {picked && picked.address === value && (
        <Text style={styles.picked}>
          {picked.own ? 'My account' : 'Address book'}:{' '}
          {formatNickname(picked.name, 20)}
        </Text>
      )}
      {open && (
        <View style={styles.list}>
          {candidates.length === 0 ? (
            <Text style={styles.empty}>No saved addresses</Text>
          ) : (
            candidates.map(candidate => (
              <Pressable
                key={candidate.id}
                accessibilityRole="button"
                onPress={() => {
                  setPicked(candidate);
                  setOpen(false);
                  onChange(candidate.address);
                }}
                style={({pressed}) => [styles.row, pressed && styles.rowPressed]}>
                <Text style={styles.name} numberOfLines={1}>
                  {formatNickname(candidate.name, 12)}
                </Text>
                <Text style={styles.address}>
                  ({formatAddress(candidate.address)})
                </Text>
              </Pressable>
            ))
          )}
        </View>
      )}
      {!!error && <Text style={formBox.errorText}>{error}</Text>}
    </View>
  );
}

const {neutral} = colorTokens;

const styles = StyleSheet.create({
  picked: {...fonts.captionReg, color: colors.textMuted, paddingHorizontal: 16},
  list: {
    borderRadius: 18,
    backgroundColor: neutral._9,
    borderWidth: 1,
    borderColor: neutral._7,
    overflow: 'hidden',
  },
  empty: {...fonts.body2Reg, color: colors.textMuted, padding: 16},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowPressed: {backgroundColor: neutral._7},
  name: {...fonts.body2Bold, color: colors.text, flexShrink: 1},
  address: {...fonts.body2Reg, color: colors.textMuted},
});
