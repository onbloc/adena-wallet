import WarningInfo from '@assets/warning-info.svg';
import React from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';

import {formBox, INPUT_PROPS} from './form-box';
import {colorTokens, fonts} from './theme';

/** The transfer memo box and the extension's exchange-memo notice under it. */
export function MemoField({
  value,
  onChange,
}: {
  value: string;
  onChange: (memo: string) => void;
}) {
  return (
    <View style={formBox.group}>
      <View style={formBox.box}>
        <TextInput
          {...INPUT_PROPS}
          accessibilityLabel="Memo"
          placeholder="Memo (Optional)"
          value={value}
          onChangeText={onChange}
          multiline
          style={formBox.input}
        />
      </View>
      <View style={styles.notice}>
        <WarningInfo width={14} height={14} />
        <Text style={styles.noticeText}>
          A memo is required when sending tokens to a centralized exchange. It
          is public on chain.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.05)',
  },
  noticeText: {...fonts.body2Reg, color: colorTokens.red._8, flex: 1},
});
