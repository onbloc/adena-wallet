import React, { PropsWithChildren, ReactElement, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControlProps, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from './screen.styles';

export interface ScreenProps {
  header?: ReactNode;
  footer?: ReactNode;
  scrollable?: boolean;
  // Pull-to-refresh control for the scrollable content.
  refreshControl?: ReactElement<RefreshControlProps>;
  testID?: string;
}

// Page template: safe area, 24px screen inset, optional pinned header and footer.
export const Screen = ({ header, footer, scrollable = true, refreshControl, testID, children }: PropsWithChildren<ScreenProps>): ReactElement => (
  <SafeAreaView testID={testID} style={styles.root} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      {scrollable
        ? (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps='handled' refreshControl={refreshControl}>
              {children}
            </ScrollView>
          )
        : <View style={[styles.content, styles.fill]}>{children}</View>}
      {footer && <View style={styles.footer}>{footer}</View>}
    </KeyboardAvoidingView>
  </SafeAreaView>
);
