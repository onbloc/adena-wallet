import { StyleSheet } from 'react-native';

import { radius, spacing } from '../../../theme';

export const styles = StyleSheet.create({
  base: {
    borderRadius: radius.circle,
    paddingHorizontal: spacing.space24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  hug: { alignSelf: 'flex-start' },
  leading: { position: 'absolute', left: spacing.space16 },
  trailing: { position: 'absolute', right: spacing.space16 },
  // Hugging buttons have no spare width for pinned icons, so they sit beside the label.
  hugContent: { gap: spacing.space8, paddingHorizontal: spacing.space16 },
  destructivePressed: { opacity: 0.85 },
});
