import { StyleSheet } from 'react-native';

import { sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  section: { gap: spacing.space8 },
  rows: { gap: spacing.space4 },
  // The design aligns the switch label with the screen edge, not the card text.
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: sizes.assetRow, gap: spacing.space12, paddingRight: spacing.space12 },
  switchLabel: { flex: 1 },
});
