import {getDateTimeText} from '@common/utils/client-utils';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {transactionScannerUrl} from '../../core/history';
import {useWallet} from '../../core/wallet-context';
import type {MainStackParams} from '../../navigation/types';
import {copyWithExpiry} from '../../security/sensitive-clipboard';
import {Address} from '../../ui/address';
import {Button, Screen, SummaryCard, SummaryRow} from '../../ui/components';
import {formatHistoryAmount} from '../../ui/history-list';
import {colors, colorTokens, fonts, monoFont} from '../../ui/theme';

type Props = NativeStackScreenProps<MainStackParams, 'TransactionDetail'>;

const TYPE_NAMES: Record<string, string> = {
  TRANSFER: 'Transfer',
  TRANSFER_GRC721: 'Transfer',
  ADD_PACKAGE: 'Add Package',
  CONTRACT_CALL: 'Contract Call',
  MULTI_CONTRACT_CALL: 'Multi Contract Call',
};

/** The extension's transaction detail: what, when, status, parties, fee, hash. */
export function TransactionDetailScreen({navigation, route}: Props) {
  const {transaction} = route.params;
  const {net} = useWallet();
  const received = transaction.valueType === 'ACTIVE';
  const counterparty = received
    ? transaction.originFrom ?? transaction.from
    : transaction.originTo ?? transaction.to;

  return (
    <Screen
      footer={
        net ? (
          <Button
            variant="secondary"
            title="View on GnoScan"
            onPress={() =>
              navigation.navigate('Browser', {
                url: transactionScannerUrl(net.network, transaction.hash),
              })
            }
          />
        ) : null
      }>
      <View style={styles.head}>
        <Text
          style={[
            styles.amount,
            received && styles.active,
            transaction.status === 'FAIL' && styles.blur,
          ]}>
          {formatHistoryAmount(transaction)}
        </Text>
        <Text style={styles.title}>{transaction.title}</Text>
      </View>
      <SummaryCard>
        <SummaryRow
          label="Date"
          value={transaction.date ? getDateTimeText(transaction.date) : '-'}
        />
        <SummaryRow
          label="Type"
          value={transaction.typeName || TYPE_NAMES[transaction.type] || '-'}
        />
        <SummaryRow
          label="Status"
          value={transaction.status === 'SUCCESS' ? 'Success' : 'Fail'}
        />
        {counterparty ? (
          <SummaryRow
            label={received ? 'From' : 'To'}
            value={<Address value={counterparty} />}
            stacked
          />
        ) : null}
        {transaction.sessionAddress ? (
          <SummaryRow
            label="Session Acc."
            value={<Address value={transaction.sessionAddress} />}
            stacked
          />
        ) : null}
        <SummaryRow
          label="Network Fee"
          value={
            transaction.networkFee
              ? `${transaction.networkFee.value} ${transaction.networkFee.denom}`
              : '-'
          }
        />
        <SummaryRow
          label="TxID"
          value={
            <Text
              selectable
              style={styles.hash}
              onLongPress={() => copyWithExpiry(transaction.hash)}>
              {transaction.hash}
            </Text>
          }
          stacked
        />
      </SummaryCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {alignItems: 'center', gap: 6, paddingVertical: 16},
  amount: {...fonts.header4, color: colors.text},
  active: {color: colorTokens.green._5},
  blur: {color: colors.textMuted},
  title: {...fonts.body2Reg, color: colors.textMuted},
  hash: {...monoFont, fontSize: 12, color: colors.textMuted},
});
