import { StyleSheet } from 'react-native';

import { colors, sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.canvas },
  content: { paddingHorizontal: sizes.screenInset, paddingBottom: spacing.space24, gap: spacing.space16 },
  fill: { flex: 1 },
  footer: { paddingHorizontal: sizes.screenInset, paddingTop: spacing.space12, paddingBottom: spacing.space8, gap: spacing.space8 },
});
