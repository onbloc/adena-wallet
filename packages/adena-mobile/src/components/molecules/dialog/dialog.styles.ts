import { StyleSheet } from 'react-native';

import { colors, elevation, radius, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.overlay.scrim, justifyContent: 'center', padding: spacing.space24 },
  dialog: {
    borderRadius: radius.surface,
    backgroundColor: colors.background.surface,
    padding: spacing.space24,
    gap: spacing.space12,
    ...elevation.overlay,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: -spacing.space12 },
  title: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.space8, marginTop: spacing.space8 },
  action: { flex: 1 },
});
