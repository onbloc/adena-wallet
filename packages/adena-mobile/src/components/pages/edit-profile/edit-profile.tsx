import React, { ReactElement } from 'react';
import { Pressable, PressableStateCallbackType, StyleProp, View, ViewStyle } from 'react-native';

import { colors } from '../../../theme';
import { formatAddress } from '../../../utils/address';
import { Avatar, Button, Icon, IconButton, Text } from '../../atoms';
import { BottomSheet, Screen, TextField, TopBar } from '../../molecules';
import { AVATAR_SIZE, styles } from './edit-profile.styles';

export interface AvatarColorOption {
  key: string;
  label: string;
  color: string;
}

export interface EditProfilePageProps {
  name: string;
  address: string;
  // Resolved background of the avatar preview; undefined uses the default.
  avatarColor?: string;
  colorOptions: AvatarColorOption[];
  selectedColorKey?: string;
  colorSheetVisible: boolean;
  onOpenColorSheet: () => void;
  onCloseColorSheet: () => void;
  onSelectColor: (key: string) => void;
  onChangeName: (value: string) => void;
  nameError?: string;
  canSave: boolean;
  onSave: () => void;
  onBack: () => void;
}

const Swatch = ({ option, selected, onSelect }: { option: AvatarColorOption; selected: boolean; onSelect: (key: string) => void }): ReactElement => {
  const handlePress = (): void => onSelect(option.key);

  const stylePressable = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [styles.swatch, { backgroundColor: option.color }, pressed && styles.swatchPressed];

  return (
    <Pressable accessibilityRole='radio' accessibilityLabel={option.label} accessibilityState={{ selected }} onPress={handlePress} style={stylePressable}>
      {selected && <Icon name='check' size={20} color={colors.text.inverse} />}
    </Pressable>
  );
};

export const EditProfilePage = (props: EditProfilePageProps): ReactElement => (
  <Screen
    header={<TopBar title='Edit profile' onBack={props.onBack} />}
    footer={<Button label='Save' disabled={!props.canSave} onPress={props.onSave} testID='edit-profile-save' />}
  >
    <View style={styles.identity}>
      <View style={styles.banner} />
      <View style={styles.avatarAnchor}>
        <View style={styles.avatarRing}>
          <Avatar name={props.name} size={AVATAR_SIZE} color={props.avatarColor} />
        </View>
        <View style={styles.badge}>
          <IconButton icon='palette' variant='primary' size={36} accessibilityLabel='Change avatar color' onPress={props.onOpenColorSheet} />
        </View>
      </View>
      <Text variant='meta' color='secondary' tabular>{formatAddress(props.address)}</Text>
    </View>
    <TextField
      label='Account name'
      value={props.name}
      onChangeText={props.onChangeName}
      error={props.nameError}
      helper='Shown only on this device.'
    />
    <BottomSheet visible={props.colorSheetVisible} title='Avatar color' onClose={props.onCloseColorSheet}>
      <View style={styles.swatches} accessibilityRole='radiogroup'>
        {props.colorOptions.map(option => (
          <Swatch key={option.key} option={option} selected={option.key === props.selectedColorKey} onSelect={props.onSelectColor} />
        ))}
      </View>
      <Button label='Done' onPress={props.onCloseColorSheet} />
    </BottomSheet>
  </Screen>
);
