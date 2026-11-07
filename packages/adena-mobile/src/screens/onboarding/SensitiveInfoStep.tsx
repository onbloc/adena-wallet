import AlertIcon from '@assets/web/alert-rounded.svg';
import LinkIcon from '@assets/web/external-link.svg';
import React from 'react';
import {Linking, Pressable, StyleSheet, View} from 'react-native';

import {colorTokens} from '../../ui/theme';
import {WebButton, WebText, WebTitle} from '../../ui/web';

/** "Sensitive Information Ahead" step shown before a secret appears or is typed. */
export function SensitiveInfoStep({
  description,
  learnMoreUrl,
  onNext,
}: {
  description: string;
  learnMoreUrl: string;
  onNext: () => void;
}) {
  return (
    <View style={styles.body}>
      <View style={styles.top}>
        <AlertIcon width={88} height={88} />
        <WebTitle
          title="Sensitive Information Ahead"
          description={description}
        />
      </View>
      <WebButton
        testID="sensitive-next"
        title="Next"
        chevron
        onPress={onNext}
      />
      <Pressable
        accessibilityRole="link"
        onPress={() => Linking.openURL(learnMoreUrl)}
        style={styles.link}>
        <WebText type="title5" color={colorTokens.webNeutral._600}>
          Learn More
        </WebText>
        <LinkIcon width={20} height={20} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {gap: 32},
  top: {gap: 32, alignItems: 'flex-start'},
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
  },
});
