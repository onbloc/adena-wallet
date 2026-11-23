import React, { PropsWithChildren, ReactElement } from 'react';

import { Button } from '../../atoms';
import { BottomSheet } from '../bottom-sheet';
import { FeeSelector, FeeSelectorProps } from '../fee-selector';
import { InlineAlert } from '../inline-alert';
import { KeyValueRow } from '../key-value-row';

export interface ReviewSheetProps {
  visible: boolean;
  title: string;
  rows: { label: string; value: string; multiline?: boolean; emphasis?: boolean }[];
  fee: FeeSelectorProps;
  error?: string;
  confirmLabel: string;
  confirming: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// Transaction review shared by token and NFT transfers: summary slot, details, fee tier, confirm.
export const ReviewSheet = ({ visible, title, rows, fee, error, confirmLabel, confirming, onConfirm, onClose, children }: PropsWithChildren<ReviewSheetProps>): ReactElement => (
  <BottomSheet visible={visible} title={title} onClose={onClose} dismissible={!confirming}>
    {children}
    {rows.map(row => <KeyValueRow key={row.label} label={row.label} value={row.value} multiline={row.multiline} emphasis={row.emphasis} />)}
    <FeeSelector {...fee} />
    {error && <InlineAlert tone='error' title='Transaction failed' description={error} />}
    <Button label={confirmLabel} loadingLabel='Broadcasting…' loading={confirming} disabled={fee.tooLow} onPress={onConfirm} testID='review-confirm' />
  </BottomSheet>
);
