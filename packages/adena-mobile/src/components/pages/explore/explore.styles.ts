import { StyleSheet } from 'react-native';

import { colors, radius, sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.canvas },
  content: { paddingHorizontal: sizes.screenInset, paddingTop: sizes.contentTop, paddingBottom: spacing.space32, gap: spacing.space8 },
  logo: { width: 40, height: 40, borderRadius: radius.smallControl, overflow: 'hidden', backgroundColor: colors.background.surface },
});
