import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { ACCOUNT_NAME_MAX_LENGTH, AvatarColor } from '../../../domain/account';
import { formatAddress } from '../../../utils/address';
import { Avatar, Button, IconButton, Text } from '../../atoms';
import { BottomSheet, Screen, TextField, TopBar } from '../../molecules';
import { AVATAR_SIZE, useStyles } from './edit-profile.styles';

export interface EditProfilePageProps {
  name: string;
  address: string;
  // Resolved fallback background when there is no photo; undefined uses the default.
  avatarColor?: AvatarColor;
  // Data URI of the pending profile photo.
  avatarPhoto?: string;
  onChangePhoto: () => void;
  // Choose/Remove options, shown only while a photo is set.
  photoSheetVisible: boolean;
  onChoosePhoto: () => void;
  onRemovePhoto: () => void;
  onClosePhotoSheet: () => void;
  onPhotoSheetDismissed?: () => void;
  onChangeName: (value: string) => void;
  nameError?: string;
  canSave: boolean;
  onSave: () => void;
  onBack: () => void;
}

export const EditProfilePage = (props: EditProfilePageProps): ReactElement => {
  const styles = useStyles();

  return (
    <Screen
      header={<TopBar title='Edit profile' onBack={props.onBack} />}
      footer={<Button label='Save' disabled={!props.canSave} onPress={props.onSave} testID='edit-profile-save' />}
    >
      <View style={styles.identity}>
        <View style={styles.banner} />
        <View style={styles.avatarAnchor}>
          <View style={styles.avatarRing}>
            <Avatar name={props.name} size={AVATAR_SIZE} color={props.avatarColor} imageUri={props.avatarPhoto} />
          </View>
          <View style={styles.badge}>
            <IconButton icon='camera' variant='primary' size={36} accessibilityLabel='Change profile photo' onPress={props.onChangePhoto} />
          </View>
        </View>
        <Text variant='meta' color='secondary' tabular>{formatAddress(props.address)}</Text>
      </View>
      <TextField
        label='Account name'
        value={props.name}
        onChangeText={props.onChangeName}
        maxLength={ACCOUNT_NAME_MAX_LENGTH}
        returnKeyType='done'
        submitBehavior='blurAndSubmit'
        onSubmitEditing={props.canSave ? props.onSave : undefined}
        error={props.nameError}
      />
      <BottomSheet visible={props.photoSheetVisible} title='Profile photo' onClose={props.onClosePhotoSheet} onDismissed={props.onPhotoSheetDismissed}>
        <Button label='Choose photo' leadingIcon='camera' onPress={props.onChoosePhoto} />
        <Button label='Remove photo' tone='destructiveText' onPress={props.onRemovePhoto} />
      </BottomSheet>
    </Screen>
  );
};
