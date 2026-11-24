import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useState } from 'react';

import { EditProfilePage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { AVATAR_COLORS, AvatarColor, isAvatarColor } from '../../../domain/account';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { useSessionStore } from '../../../stores/session.store';
import { useToastStore } from '../../../stores/toast.store';
import { avatarColors } from '../../../theme';

const COLOR_OPTIONS = AVATAR_COLORS.map(key => ({ key, label: `${key[0].toUpperCase()}${key.slice(1)}`, color: avatarColors[key] }));

// Local-only profile: the account name and avatar color never leave the device.
export const EditProfileScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'EditProfile'>): ReactElement | null => {
  const { accountId } = route.params;
  const { accountService } = useContainer();
  const { accounts, network } = useWalletSnapshot();
  const bumpRevision = useSessionStore(state => state.bumpRevision);
  const showToast = useToastStore(state => state.show);
  const account = accounts.find(item => item.id === accountId);
  const savedColor = isAvatarColor(account?.avatarColor) ? account.avatarColor : undefined;
  const [name, setName] = useState(account?.name ?? '');
  const [color, setColor] = useState<AvatarColor | undefined>(savedColor);
  const [sheetVisible, setSheetVisible] = useState(false);

  if (!account) {
    return null;
  }

  const trimmed = name.trim();
  const nameError = trimmed ? undefined : 'Account name is required';
  const changed = trimmed !== account.name || color !== savedColor;

  const handleSave = (): void => {
    try {
      accountService.updateProfile(account.id, { name: trimmed, avatarColor: color });
      bumpRevision();
      showToast('Profile updated', 'success');
      navigation.goBack();
    }
    catch (error) {
      showToast(toErrorMessage(error), 'error');
    }
  };

  const handleSelectColor = (key: string): void => {
    if (isAvatarColor(key)) {
      setColor(key);
    }
  };

  const handleOpenColorSheet = (): void => setSheetVisible(true);

  const handleCloseColorSheet = (): void => setSheetVisible(false);

  return (
    <EditProfilePage
      name={name}
      address={accountService.getAddress(account, network)}
      avatarColor={color ? avatarColors[color] : undefined}
      colorOptions={COLOR_OPTIONS}
      selectedColorKey={color ?? AvatarColor.INK}
      colorSheetVisible={sheetVisible}
      onOpenColorSheet={handleOpenColorSheet}
      onCloseColorSheet={handleCloseColorSheet}
      onSelectColor={handleSelectColor}
      onChangeName={setName}
      nameError={nameError}
      canSave={changed && !nameError}
      onSave={handleSave}
      onBack={navigation.goBack}
    />
  );
};
