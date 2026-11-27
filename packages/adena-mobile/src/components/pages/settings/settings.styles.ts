import { StyleSheet } from 'react-native';

import { sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  // 24pt between sections, as in the design.
  section: { gap: spacing.space8, marginTop: spacing.space8 },
  rows: { gap: spacing.space4 },
  // The design aligns the switch label with the screen edge, not the card text.
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: sizes.assetRow, gap: spacing.space12, paddingRight: spacing.space12 },
  switchLabel: { flex: 1 },
  // Sheet rows sit on the sheet surface without the card fill.
  option: { flexDirection: 'row', alignItems: 'center', minHeight: sizes.assetRow, gap: spacing.space12 },
  optionTexts: { flex: 1, gap: 2 },
  optionTitle: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.space8 },
  options: { gap: spacing.space4 },
});
