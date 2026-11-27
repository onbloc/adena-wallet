import { StyleSheet } from 'react-native';

import { spacing } from '../../../theme';

export const styles = StyleSheet.create({
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.space12 },
  resultsTitle: { flex: 1 },
  // Half-width pill, as in the design.
  scope: { flex: 1 },
  section: { gap: spacing.space8 },
  collectionThumbnail: { width: 32, height: 32 },
});
