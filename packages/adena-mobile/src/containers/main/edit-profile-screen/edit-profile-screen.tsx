import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useRef, useState } from 'react';

import { EditProfilePage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { pickProfilePhoto } from '../../../infrastructure/media/profile-photo-picker';
import { MainStackParamList } from '../../../navigation/types';
import { toAvatarColor } from '../../../presenters/account.presenter';
import { useSessionStore } from '../../../stores/session.store';
import { useToastStore } from '../../../stores/toast.store';

// Local-only profile: the account name and photo never leave the device.
export const EditProfileScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'EditProfile'>): ReactElement | null => {
  const { accountId } = route.params;
  const { accountService, accountPhotoService } = useContainer();
  const { accounts, network } = useWalletSnapshot();
  const bumpRevision = useSessionStore(state => state.bumpRevision);
  const showToast = useToastStore(state => state.show);
  const account = accounts.find(item => item.id === accountId);
  const [savedPhoto] = useState(() => accountPhotoService.get(accountId));
  const [name, setName] = useState(account?.name ?? '');
  const [photo, setPhoto] = useState(savedPhoto);
  const [sheetVisible, setSheetVisible] = useState(false);
  // The picker waits for the sheet's modal to close; iOS cannot present it over a dismissing modal.
  const pickAfterSheetRef = useRef(false);

  if (!account) {
    return null;
  }

  const trimmed = name.trim();
  const nameError = trimmed ? undefined : 'Account name is required';
  const changed = trimmed !== account.name || photo !== savedPhoto;

  const handleSave = (): void => {
    try {
      accountService.updateProfile(account.id, { name: trimmed });

      if (photo !== savedPhoto) {
        if (photo) {
          accountPhotoService.save(account.id, photo);
        }
        else {
          accountPhotoService.remove(account.id);
        }
      }

      bumpRevision();
      showToast('Profile updated', 'success');
      navigation.goBack();
    }
    catch (error) {
      showToast(toErrorMessage(error), 'error');
    }
  };

  const choosePhoto = async (): Promise<void> => {
    try {
      const picked = await pickProfilePhoto();

      if (picked) {
        setPhoto(picked);
      }
    }
    catch (error) {
      showToast(toErrorMessage(error), 'error');
    }
  };

  // Without a photo there is nothing to remove, so the picker opens directly.
  const handleChangePhoto = (): void => {
    if (photo) {
      setSheetVisible(true);
    }
    else {
      choosePhoto();
    }
  };

  const handleChoosePhoto = (): void => {
    pickAfterSheetRef.current = true;
    setSheetVisible(false);
  };

  const handlePhotoSheetDismissed = (): void => {
    if (pickAfterSheetRef.current) {
      pickAfterSheetRef.current = false;
      choosePhoto();
    }
  };

  const handleRemovePhoto = (): void => {
    setPhoto(undefined);
    setSheetVisible(false);
  };

  const handleClosePhotoSheet = (): void => setSheetVisible(false);

  return (
    <EditProfilePage
      name={name}
      address={accountService.getAddress(account, network)}
      avatarColor={toAvatarColor(account)}
      avatarPhoto={photo}
      onChangePhoto={handleChangePhoto}
      photoSheetVisible={sheetVisible}
      onChoosePhoto={handleChoosePhoto}
      onRemovePhoto={handleRemovePhoto}
      onClosePhotoSheet={handleClosePhotoSheet}
      onPhotoSheetDismissed={handlePhotoSheetDismissed}
      onChangeName={setName}
      nameError={nameError}
      canSave={changed && !nameError}
      onSave={handleSave}
      onBack={navigation.goBack}
    />
  );
};
