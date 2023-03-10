import { Storage } from '.';

export class ChromeSessionStorage implements Storage {

  private storage: chrome.storage.SessionStorageArea;

  constructor() {
    this.storage = chrome.storage.session;
  }

  public get = async (key: string) => {
    const values = await this.storage.get(key);
    const value = values[`${key}`] ?? '';
    return `${value}`;
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