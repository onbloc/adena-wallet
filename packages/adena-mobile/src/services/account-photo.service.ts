import { AppError, AppErrorCode } from '../core/errors';
import { AccountPhotoRepository } from '../repositories/account-photo.repository';

// A 256px JPEG at quality 0.7 is ~20-40 KB; the cap keeps MMKV small even for odd encoder output.
export const ACCOUNT_PHOTO_MAX_BYTES = 200 * 1024;

const DATA_URI_PATTERN = /^data:image\/(jpeg|png|webp|heic);base64,[A-Za-z0-9+/]+=*$/;

// Local-only profile photos; removed with their account and on factory reset.
export class AccountPhotoService {
  constructor(private readonly repository: AccountPhotoRepository) {}

  get(accountId: string): string | undefined {
    const photo = this.repository.get(accountId);

    // Validated on save; a cheap prefix check is enough on the hot read path.
    return photo?.startsWith('data:image/') ? photo : undefined;
  }

  save(accountId: string, dataUri: string): void {
    if (!DATA_URI_PATTERN.test(dataUri)) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Unsupported image');
    }

    if (dataUri.length > ACCOUNT_PHOTO_MAX_BYTES) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'This photo is too large. Choose a smaller one.');
    }

    this.repository.save(accountId, dataUri);
  }

  remove(accountId: string): void {
    this.repository.removeAccount(accountId);
  }

  removeAccount(accountId: string): void {
    this.repository.removeAccount(accountId);
  }
}
