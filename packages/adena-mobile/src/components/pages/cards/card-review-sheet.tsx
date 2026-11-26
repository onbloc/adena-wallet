import React, { ReactElement } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { Button, Icon, Text } from '../../atoms';
import { BottomSheet, FeeSelector, FeeSelectorProps, HoldToConfirmButton, InlineAlert, KeyValueRow } from '../../molecules';
import { ReviewContent } from '../../view-models';
import { Assurances, RestrictionChips } from './card-parts';
import { useStyles } from './card-review-sheet.styles';

// Restrictions show as red chips, assurances with green checks.
export type CardReview = ReviewContent & { fee: FeeSelectorProps };

export interface CardReviewSheetProps {
  review?: CardReview;
  confirming: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}

// Share of the window the details may take; the rest keeps the title and the buttons on screen.
const BODY_MAX_HEIGHT_RATIO = 0.6;

// Issuing or ending a card, or moving funds into an order, is approved by a continuous hold.
export const CardReviewSheet = ({ review, confirming, error, onConfirm, onClose }: CardReviewSheetProps): ReactElement | null => {
  const styles = useStyles();
  const { height } = useWindowDimensions();

  if (!review) {
    return null;
  }

  return (
    <BottomSheet visible title={review.title} description={review.subtitle} onClose={onClose} dismissible={!confirming}>
      <ScrollView
        style={{ maxHeight: Math.round(height * BODY_MAX_HEIGHT_RATIO) }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps='handled'
        nestedScrollEnabled
        testID='review-body'
      >
        <View style={styles.facts}>
          {review.facts.map((fact, index) => (
            <View key={fact.label} style={[styles.fact, index > 0 && styles.factDivider]}>
              <View style={styles.factIcon}><Icon name={fact.icon} size={20} /></View>
              <View style={styles.factText}>
                <Text variant='meta' color='secondary'>{fact.label}</Text>
                <Text variant='row' selectable>{fact.value}</Text>
              </View>
            </View>
          ))}
        </View>
        {review.restrictions && review.restrictions.length > 0 && <RestrictionChips items={review.restrictions} />}
        {review.assurances && review.assurances.length > 0 && <Assurances items={review.assurances} />}
        {review.rows?.map(row => <KeyValueRow key={row.label} label={row.label} value={row.value} multiline />)}
        {review.worstCase && (
          <View style={styles.worstCase}>
            <Text variant='meta' style={styles.worstCaseLabel}>Worst case</Text>
            <View style={styles.worstCaseRow}>
              <Text variant='title' style={styles.worstCaseValue}>{review.worstCase.value}</Text>
              {review.worstCase.caption && <Text variant='meta' style={styles.worstCaseLabel}>{review.worstCase.caption}</Text>}
            </View>
          </View>
        )}
        {review.warnings.map(warning => <InlineAlert key={warning.title} tone='warning' title={warning.title} description={warning.description} />)}
        <FeeSelector {...review.fee} />
        {error && <InlineAlert tone='error' title='Transaction failed' description={error} />}
      </ScrollView>
      <View style={styles.footer}>
        <Button label='Cancel' tone='secondary' fullWidth={false} disabled={confirming} onPress={onClose} style={styles.cancel} />
        <View style={styles.confirm}>
          <HoldToConfirmButton
            label={review.confirmLabel}
            loadingLabel='Broadcasting…'
            tone={review.destructive ? 'destructive' : 'primary'}
            loading={confirming}
            disabled={review.fee.tooLow}
            onConfirm={onConfirm}
            testID='review-confirm'
          />
        </View>
      </View>
    </BottomSheet>
  );
};
