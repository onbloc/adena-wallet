import { launchImageLibrary } from 'react-native-image-picker';

import { isAppError } from '../../../../src/core/errors';
import { pickProfilePhoto } from '../../../../src/infrastructure/media/profile-photo-picker';

const launchMock = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;

describe('pickProfilePhoto', () => {
  beforeEach(() => launchMock.mockReset());

  it('asks for one small compressed photo and returns it as a data URI', async () => {
    launchMock.mockResolvedValue({ assets: [{ base64: 'QUJD', type: 'image/jpeg' }] });

    await expect(pickProfilePhoto()).resolves.toBe('data:image/jpeg;base64,QUJD');
    expect(launchMock).toHaveBeenCalledWith(expect.objectContaining({
      mediaType: 'photo',
      maxWidth: 256,
      maxHeight: 256,
      quality: 0.7,
      includeBase64: true,
      selectionLimit: 1,
    }));
  });

  it('defaults the type to JPEG and returns null when canceled', async () => {
    launchMock.mockResolvedValueOnce({ assets: [{ base64: 'QUJD' }] });
    launchMock.mockResolvedValueOnce({ didCancel: true });

    await expect(pickProfilePhoto()).resolves.toBe('data:image/jpeg;base64,QUJD');
    await expect(pickProfilePhoto()).resolves.toBeNull();
  });

  it('rejects picker errors and assets without data', async () => {
    launchMock.mockResolvedValueOnce({ errorCode: 'permission', errorMessage: 'Photo access denied' });
    launchMock.mockResolvedValueOnce({ assets: [{ uri: 'file:///a.jpg' }] });

    await expect(pickProfilePhoto()).rejects.toThrow('Photo access denied');
    const error = await pickProfilePhoto().catch((caught: unknown) => caught);

    expect(isAppError(error, 'INVALID_REQUEST')).toBe(true);
  });
});
