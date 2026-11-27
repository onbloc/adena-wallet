import React, { PropsWithChildren, ReactElement, ReactNode } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardHeight } from '../../../hooks/use-keyboard-height';
import { Button } from '../../atoms';
import { BottomSheet } from '../bottom-sheet';
import { FeeSelector, FeeSelectorProps } from '../fee-selector';
import { InlineAlert } from '../inline-alert';
import { KeyValueRow } from '../key-value-row';
import { styles } from './review-sheet.styles';

// Share of the window the details may take; the rest keeps the title and the confirm button on screen.
const BODY_MAX_HEIGHT_RATIO = 0.55;
// Room the title, confirm button and sheet padding keep while the keyboard (custom gas) is up.
const SHEET_CHROME_HEIGHT = 200;
const MIN_BODY_HEIGHT = 120;

export interface ReviewSheetProps {
  visible: boolean;
  title: string;
  rows: { label: string; value: string; multiline?: boolean; emphasis?: boolean }[];
  fee: FeeSelectorProps;
  // Rendered below the fee, e.g. the total including it.
  totals?: ReactNode;
  error?: string;
  confirmLabel: string;
  confirming: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// Transaction review shared by token and NFT transfers: summary slot, details, fee tier, confirm.
// The details scroll inside a bounded area so a long review (e.g. exact-output swaps) never pushes the button off screen.
export const ReviewSheet = ({ visible, title, rows, fee, totals, error, confirmLabel, confirming, onConfirm, onClose, children }: PropsWithChildren<ReviewSheetProps>): ReactElement => {
  const { height } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const bodyMaxHeight = Math.max(MIN_BODY_HEIGHT, Math.round(Math.min(height * BODY_MAX_HEIGHT_RATIO, height - top - keyboardHeight - SHEET_CHROME_HEIGHT)));

  return (
    <BottomSheet visible={visible} title={title} onClose={onClose} dismissible={!confirming}>
      <ScrollView
        style={[styles.body, { maxHeight: bodyMaxHeight }]}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps='handled'
        // Decimal pads have no return key; dragging the details dismisses it.
        keyboardDismissMode='interactive'
        nestedScrollEnabled
        testID='review-body'
      >
        {children}
        {rows.map(row => <KeyValueRow key={row.label} label={row.label} value={row.value} multiline={row.multiline} emphasis={row.emphasis} />)}
        <FeeSelector {...fee} />
        {totals}
        {error && <InlineAlert tone='error' title='Transaction failed' description={error} />}
      </ScrollView>
      <Button label={confirmLabel} loadingLabel='Broadcasting…' loading={confirming} disabled={fee.tooLow} onPress={onConfirm} testID='review-confirm' />
    </BottomSheet>
  );
};
