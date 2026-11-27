import React, { PropsWithChildren, ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../../../theme';
import { IconButton, Text } from '../../atoms';
import { useStyles } from './bottom-sheet.styles';

export interface SheetFrameProps {
  title: string;
  description?: string;
  // Shows the close button; omitted while the sheet cannot be dismissed.
  onClose?: () => void;
}

// Sheet chrome: title, close button, description and a 24px inset. iOS draws the native grabber and
// lays the sheet out above the home indicator; Android's sheet runs under the navigation bar.
export const SheetFrame = ({ title, description, onClose, children }: PropsWithChildren<SheetFrameProps>): ReactElement => {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const nativeGrabber = Platform.OS === 'ios';

  return (
    // Not flattened: react-native-screens resizes a ScrollView it finds as a direct child of the sheet's content.
    <View
      collapsable={false}
      style={[
        styles.sheet,
        { paddingTop: nativeGrabber ? spacing.space20 : spacing.space8, paddingBottom: (nativeGrabber ? 0 : insets.bottom) + spacing.space20 },
      ]}
    >
      {!nativeGrabber && <View style={styles.handle} />}
      <View style={styles.header}>
        <Text variant='title' style={styles.title} accessibilityRole='header'>{title}</Text>
        {onClose && <IconButton icon='close' variant='primary' accessibilityLabel='Close' onPress={onClose} />}
      </View>
      {description && <Text variant='body' color='secondary'>{description}</Text>}
      <View collapsable={false} style={styles.content}>{children}</View>
    </View>
  );
};
