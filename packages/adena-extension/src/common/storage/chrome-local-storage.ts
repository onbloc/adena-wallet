import { Storage } from '.';

export class ChromeLocalStorage implements Storage {

  private storage: chrome.storage.LocalStorageArea;

  constructor() {
    this.storage = chrome.storage.local;
  }

  public get = async (key: string) => {
    const values = await this.storage.get(key);
    const value = values[`${key}`] ?? '';
    return value;
  };

  public set = async (key: string, value: string) => {
    await this.storage.set({
      [key]: `${value}`,
    });
  };

  public remove = async (key: string) => {
    await this.storage.remove(key);
  };

  public clear = async () => {
    await this.storage.clear();
  };
}