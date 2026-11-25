import { isAppError } from '../../../src/core/errors';
import { ACCOUNT_PHOTO_KEY_PREFIX } from '../../../src/migration/storage-keys';
import { StorageAccountPhotoRepository } from '../../../src/repositories/account-photo.repository';
import { ACCOUNT_PHOTO_MAX_BYTES, AccountPhotoService } from '../../../src/services/account-photo.service';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

const setup = () => {
  const store = new MemoryKeyValueStore();

  return { store, service: new AccountPhotoService(new StorageAccountPhotoRepository(store)) };
};

const codeOf = (run: () => void): string | undefined => {
  try {
    run();
  }
  catch (error) {
    return isAppError(error) ? error.code : String(error);
  }

  return undefined;
};

describe('AccountPhotoService', () => {
  it('stores one photo per account under its own key and removes it', () => {
    const { store, service } = setup();

    expect(service.get('a')).toBeUndefined();
    service.save('a', JPEG);
    service.save('b', 'data:image/png;base64,iVBORw0KGgo=');

    expect(service.get('a')).toBe(JPEG);
    expect(store.getString(`${ACCOUNT_PHOTO_KEY_PREFIX}a`)).toBe(JPEG);
    service.remove('a');
    service.removeAccount('b');
    expect(service.get('a')).toBeUndefined();
    expect(service.get('b')).toBeUndefined();
    expect(store.getAllKeys()).toEqual([]);
  });

  it('rejects anything but a base64 image data URI and oversized photos', () => {
    const { service } = setup();
    const oversized = `data:image/jpeg;base64,${'A'.repeat(ACCOUNT_PHOTO_MAX_BYTES)}`;

    expect(codeOf(() => service.save('a', 'https://example.com/a.jpg'))).toBe('INVALID_REQUEST');
    expect(codeOf(() => service.save('a', 'data:text/html;base64,PGI+'))).toBe('INVALID_REQUEST');
    expect(codeOf(() => service.save('a', oversized))).toBe('INVALID_REQUEST');
    expect(service.get('a')).toBeUndefined();
  });

  it('ignores a stored value that is not an image data URI', () => {
    const { store, service } = setup();

    store.setString(`${ACCOUNT_PHOTO_KEY_PREFIX}a`, 'garbage');
    expect(service.get('a')).toBeUndefined();
  });
});
