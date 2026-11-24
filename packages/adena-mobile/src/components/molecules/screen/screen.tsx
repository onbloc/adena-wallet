import React, { PropsWithChildren, ReactElement, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from './screen.styles';

export interface ScreenProps {
  header?: ReactNode;
  footer?: ReactNode;
  scrollable?: boolean;
  testID?: string;
}

// Page template: safe area, 20px screen inset, optional pinned header and footer.
export const Screen = ({ header, footer, scrollable = true, testID, children }: PropsWithChildren<ScreenProps>): ReactElement => (
  <SafeAreaView testID={testID} style={styles.root} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      {scrollable
        ? (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps='handled'>
              {children}
            </ScrollView>
          )
        : <View style={[styles.content, styles.fill]}>{children}</View>}
      {footer && <View style={styles.footer}>{footer}</View>}
    </KeyboardAvoidingView>
  </SafeAreaView>
);
