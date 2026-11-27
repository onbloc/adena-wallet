import { StyleSheet } from 'react-native';

import { makeStyles, radius, spacing } from '../../../theme';

export const useStyles = makeStyles(colors => ({
  row: { gap: spacing.space8, maxWidth: '100%' },
  rowUser: { alignItems: 'flex-end' },
  rowAssistant: { alignItems: 'flex-start' },
  bubble: { maxWidth: '88%', paddingHorizontal: spacing.space16, paddingVertical: spacing.space12, borderRadius: radius.surface },
  bubbleUser: { backgroundColor: colors.action.primary, borderBottomRightRadius: radius.smallControl },
  bubbleAssistant: {
    backgroundColor: colors.background.subtle,
    borderBottomLeftRadius: radius.smallControl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
  },
  attachments: { alignSelf: 'stretch', gap: spacing.space8 },
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space8 },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
    paddingHorizontal: spacing.space12,
    paddingVertical: spacing.space4,
    borderRadius: radius.circle,
    backgroundColor: colors.background.subtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
  },
}));
