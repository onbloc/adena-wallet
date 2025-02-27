import { CommonError } from '@common/errors/common';
import { Storage } from '.';

export class ChromeSessionStorage implements Storage {
  private storage: chrome.storage.LocalStorageArea;

  constructor() {
    if (!chrome.storage) {
      throw new CommonError('FAILED_INITIALIZE_CHROME_API');
    }
    this.storage = chrome.storage.local;
  }

  public get = async (key: string): Promise<string> => {
    const value = await new Promise<string>((resolve) => {
      this.storage.get([key], (result) => {
        resolve(`${result?.[key] || ''}`);
      });
    });
    return `${value}`;
  };

  public set = async (key: string, value: string): Promise<void> => {
    await this.storage.set({
      [key]: `${value}`,
    });
  };

  public remove = async (key: string): Promise<void> => {
    await this.set(key, '');
    await this.storage.remove(key);
  };

  public clear = async (): Promise<void> => {
    await this.storage.clear();
  };
}
