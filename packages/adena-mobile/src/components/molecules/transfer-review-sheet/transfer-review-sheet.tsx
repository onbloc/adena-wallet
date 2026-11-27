import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { LocalTokenIcon } from '../../../domain/token';
import { Divider, Text } from '../../atoms';
import { FeeSelectorProps } from '../fee-selector';
import { ReviewSheet } from '../review-sheet';
import { TokenImage } from '../token-image';
import { styles } from './transfer-review-sheet.styles';

// All labels are pre-formatted with their symbols (fees are always in the native token).
export interface TransferReview {
  amountLabel: string;
  amountFiatLabel?: string;
  recipientName?: string;
  recipientAddress: string;
  networkName: string;
  memo?: string;
  // Contract of a GRC20 token, shown so the user can tell look-alike tokens apart.
  tokenRealm?: string;
  totalLabel?: string;
  totalFiatLabel?: string;
  fee: FeeSelectorProps;
}

export interface TransferReviewSheetProps {
  review: TransferReview;
  symbol: string;
  tokenLocalIcon?: LocalTokenIcon;
  tokenImageUrl?: string;
  error?: string;
  confirming: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// Token transfer review shared by the Send flow and the assistant, so both look the same.
export const TransferReviewSheet = ({ review, symbol, tokenLocalIcon, tokenImageUrl, error, confirming, onConfirm, onClose }: TransferReviewSheetProps): ReactElement => (
  <ReviewSheet
    visible
    title='Review transfer'
    rows={[
      { label: 'Network', value: review.networkName, emphasis: true },
      ...(review.memo ? [{ label: 'Memo', value: review.memo, multiline: true }] : []),
      ...(review.tokenRealm ? [{ label: 'Token realm', value: review.tokenRealm, multiline: true }] : []),
    ]}
    fee={review.fee}
    totals={review.totalLabel !== undefined && (
      <>
        <Divider />
        <View style={styles.totalRow}>
          <Text variant='meta' color='secondary'>Total</Text>
          <Text variant='row' tabular selectable style={styles.totalValue}>{review.totalLabel}</Text>
        </View>
        {review.totalFiatLabel && (
          <Text variant='meta' color='secondary' tabular align='right'>{`${review.totalFiatLabel} including network fee`}</Text>
        )}
      </>
    )}
    error={error}
    confirmLabel='Confirm send'
    confirming={confirming}
    onConfirm={onConfirm}
    onClose={onClose}
  >
    <View style={styles.amount}>
      <View style={styles.amountRow}>
        <TokenImage symbol={symbol} localIcon={tokenLocalIcon} imageUrl={tokenImageUrl} size={32} />
        <Text variant='display' tabular adjustsFontSizeToFit numberOfLines={1} style={styles.amountLabel}>{review.amountLabel}</Text>
      </View>
      {review.amountFiatLabel ? <Text variant='meta' color='secondary' tabular align='center'>{review.amountFiatLabel}</Text> : null}
    </View>
    <View style={styles.recipient}>
      <Text variant='meta' color='secondary'>To</Text>
      {review.recipientName ? <Text variant='row'>{review.recipientName}</Text> : null}
      <Text variant='meta' color='secondary' tabular selectable>{review.recipientAddress}</Text>
    </View>
  </ReviewSheet>
);
