import { launchImageLibrary } from 'react-native-image-picker';

import { AppError, AppErrorCode } from '../../core/errors';

// Small enough for a local data URI; the round avatar crops the center with resizeMode cover.
const PROFILE_PHOTO_OPTIONS = {
  mediaType: 'photo',
  maxWidth: 256,
  maxHeight: 256,
  quality: 0.7,
  includeBase64: true,
  selectionLimit: 1,
} as const;

// Opens the system photo picker (PHPicker on iOS, Photo Picker on Android 13+); null when canceled.
export const pickProfilePhoto = async (): Promise<string | null> => {
  const response = await launchImageLibrary(PROFILE_PHOTO_OPTIONS);

  if (response.didCancel) {
    return null;
  }

  const asset = response.assets?.[0];

  if (response.errorCode || !asset?.base64) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, response.errorMessage ?? 'Could not load this photo');
  }

  return `data:${asset.type ?? 'image/jpeg'};base64,${asset.base64}`;
};
