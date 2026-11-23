import { StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  image: { alignItems: 'center' },
  names: { gap: spacing.space4 },
  traits: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space8 },
  trait: { width: '48%', padding: spacing.space12, borderRadius: radius.input, backgroundColor: colors.background.subtle, gap: 2 },
});
