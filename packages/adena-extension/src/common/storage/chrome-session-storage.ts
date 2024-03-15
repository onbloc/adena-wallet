import { CommonError } from '@common/errors/common';
import { Storage } from '.';

export class ChromeSessionStorage implements Storage {
  private storage: chrome.storage.SessionStorageArea;

  constructor() {
    if (!chrome.storage) {
      throw new CommonError('FAILED_INITIALIZE_CHROME_API');
    }
    this.storage = chrome.storage.session;
  }

  public get = async (key: string): Promise<string> => {
    const values = await this.storage.get(key);
    const value = values[`${key}`] ?? '';
    return `${value}`;
  };

  public set = async (key: string, value: string): Promise<void> => {
    await this.storage.set({
      [key]: `${value}`,
    });
  };

  public remove = async (key: string): Promise<void> => {
    await this.storage.remove(key);
  };

  public clear = async (): Promise<void> => {
    await this.storage.clear();
  };
}
