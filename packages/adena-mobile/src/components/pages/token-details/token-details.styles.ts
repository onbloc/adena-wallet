import { StyleSheet } from 'react-native';

import { colors, sizes, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.canvas },
  content: { paddingHorizontal: sizes.screenInset, paddingTop: sizes.contentTop, paddingBottom: spacing.space32, gap: spacing.space16 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.space12 },
  names: { flex: 1, gap: 2 },
  price: { gap: spacing.space4 },
  section: { gap: spacing.space8 },
  readMore: { alignSelf: 'center', paddingVertical: spacing.space8, minHeight: sizes.touchTarget, justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: spacing.space8, paddingHorizontal: sizes.screenInset, paddingTop: spacing.space12, paddingBottom: sizes.footerBottom },
  action: { flex: 1 },
});
