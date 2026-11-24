import { StyleSheet } from 'react-native';

import { spacing } from '../../../theme';

export const styles = StyleSheet.create({
  phraseHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.space12 },
  phraseTitle: { flex: 1 },
  // Room for the button's absolutely positioned 20pt leading icon.
  copy: { paddingLeft: spacing.space16 + 20 + spacing.space8 },
});
