import React, { ReactElement } from 'react';

import { FeeSelectorProps, InlineAlert, ReviewSheet } from '../../molecules';

export interface CardReview {
  title: string;
  rows: { label: string; value: string; multiline?: boolean; emphasis?: boolean }[];
  warnings: { title: string; description?: string }[];
  fee: FeeSelectorProps;
  confirmLabel: string;
  destructive?: boolean;
}

export interface CardReviewSheetProps {
  review?: CardReview;
  confirming: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}

// Issuing or ending a card changes what can act for the account, so it is confirmed by a hold.
export const CardReviewSheet = ({ review, confirming, error, onConfirm, onClose }: CardReviewSheetProps): ReactElement | null => {
  if (!review) {
    return null;
  }

  return (
    <ReviewSheet
      visible
      title={review.title}
      rows={review.rows}
      fee={review.fee}
      error={error}
      confirmLabel={review.confirmLabel}
      confirming={confirming}
      confirmMode='hold'
      confirmTone={review.destructive ? 'destructive' : 'primary'}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      {review.warnings.map(warning => <InlineAlert key={warning.title} tone='warning' title={warning.title} description={warning.description} />)}
    </ReviewSheet>
  );
};
