import { ViewStyle } from 'react-native';

import { makeStyles, radius, sizes, spacing } from '../../../theme';

const PILL_PADDING = spacing.space4;

export const ITEM_SIZE = sizes.bottomNavigation - PILL_PADDING * 2;

const floatingShadow = (shadowColor: string): ViewStyle => ({
  shadowColor,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 12,
  shadowOpacity: 0.1,
  elevation: 4,
});

export const useStyles = makeStyles(colors => ({
  // Only the pill and the action paint; the gap between them lets touches reach the content.
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sizes.screenInset,
  },
  destinations: {
    flexDirection: 'row',
    gap: spacing.space4,
    padding: PILL_PADDING,
    borderRadius: radius.circle,
    backgroundColor: colors.background.surface,
    ...floatingShadow(colors.overlay.shadow),
  },
  action: { marginLeft: 'auto', borderRadius: radius.circle, ...floatingShadow(colors.overlay.shadow) },
}));
