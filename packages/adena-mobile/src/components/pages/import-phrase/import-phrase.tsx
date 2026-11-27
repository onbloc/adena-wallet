import React, { ReactElement, useState } from 'react';
import { Platform, TextInput, View } from 'react-native';

import { useAppTheme } from '../../../hooks/use-app-theme';
import { useThemeColors } from '../../../theme';
import { Button, Text } from '../../atoms';
import { BottomSheet, PageHeading, Screen, SECRET_INPUT_PROPS, TopBar } from '../../molecules';
import { useStyles } from './import-phrase.styles';

export interface ImportPhrasePageProps {
  phrase: string;
  onChangePhrase: (value: string) => void;
  onPaste: () => void;
  // Masked after the app left the foreground, so the app-switcher snapshot holds no words.
  hidden?: boolean;
  onReveal?: () => void;
  error?: string;
  onSubmit: () => void;
  onBack: () => void;
}

export const countWords = (phrase: string): number => phrase.trim().split(/\s+/).filter(Boolean).length;

export const ImportPhrasePage = ({ phrase, onChangePhrase, onPaste, hidden = false, onReveal, error, onSubmit, onBack }: ImportPhrasePageProps): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();
  const { scheme } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const words = countWords(phrase);
  const borderColor = error ? colors.status.error : focused ? colors.border.focus : colors.border.input;

  return (
    <Screen
      header={<TopBar onBack={onBack} />}
      footer={(
        <>
          <Button label='Continue' disabled={words === 0} onPress={onSubmit} testID='import-submit' />
          <Button label='Where do I find my phrase?' tone='tertiary' onPress={() => setHelpVisible(true)} testID='import-help' />
        </>
      )}
    >
      <PageHeading
        eyebrow='Import / Recovery phrase'
        title={'Enter your\nrecovery phrase.'}
        description='Enter each word in the correct order, separated by a space.'
      />
      <View style={[styles.box, { borderColor, borderWidth: focused || error ? 1.5 : 1 }]}>
        {hidden
          ? (
              <View style={styles.masked} testID='import-secret-masked'>
                <Text variant='body' color='secondary'>Your recovery phrase is hidden.</Text>
                <Button label='Show' tone='secondary' size='compact' leadingIcon='eye' fullWidth={false} onPress={onReveal} testID='import-reveal' />
              </View>
            )
          : (
              <TextInput
                {...SECRET_INPUT_PROPS}
                // Android keyboards do not learn or suggest from a visible-password field.
                {...(Platform.OS === 'android' && { keyboardType: 'visible-password' as const })}
                accessibilityLabel='Recovery phrase'
                value={phrase}
                onChangeText={onChangePhrase}
                placeholder='Enter your recovery phrase'
                placeholderTextColor={colors.text.secondary}
                multiline
                // Words are space separated, so Return never inserts a newline in the phrase.
                submitBehavior='blurAndSubmit'
                returnKeyType='done'
                keyboardAppearance={scheme}
                selectionColor={colors.text.primary}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={[styles.input, { color: colors.text.primary }]}
                testID='import-secret'
              />
            )}
        <View style={styles.footerRow}>
          <Text variant='meta' color='secondary' tabular>{`${words} ${words === 1 ? 'word' : 'words'}`}</Text>
          <Button label='Paste' tone='secondary' size='compact' fullWidth={false} onPress={onPaste} style={styles.paste} testID='import-paste' />
        </View>
      </View>
      {error
        ? <Text variant='meta' color='error' testID='import-error'>{error}</Text>
        : <Text variant='meta' color='secondary' style={styles.note}>Your recovery phrase will only be stored on this device.</Text>}
      <BottomSheet
        visible={helpVisible}
        title='Where do I find my phrase?'
        description='Your recovery phrase is the 12 or 24 words you wrote down when you created your wallet. In Adena it is under Settings > Recovery phrase.'
        onClose={() => setHelpVisible(false)}
      >
        <Button label='Got it' onPress={() => setHelpVisible(false)} />
      </BottomSheet>
    </Screen>
  );
};
