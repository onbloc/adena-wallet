import { Storage } from "./storage";
import { ChromeLocalStorage } from "./chrome-local-storage";

type objectType = { [key in string]: any };

export class StorageManager<T extends string = string> {

  private storage: Storage;

  constructor(storage?: Storage) {
    this.storage = storage ?? new ChromeLocalStorage();
  }

  get = async (valueType: T): Promise<string> => {
    const value = await this.storage.get(valueType);
    return `${value}`;
  };

  set = async (valueType: T, value: string | number) => {
    await this.storage.set(valueType, `${value}`);
  };

  remove = async (valueType: T) => {
    await this.storage.remove(valueType);
  };

  claer = async () => {
    await this.storage.clear();
  };

  getToNumbers = async (valueType: T): Promise<Array<number>> => {
    const numbers: Array<number> = [];
    const value = await this.storage.get(valueType);

    if (value === '') {
      return numbers;
    }

    const numberStrings = value.split(',');
    for (const numberString of numberStrings) {
      try {
        const number = parseInt(numberString);
        if (number >= 0) {
          numbers.push(number);
        }
      } catch (e) {
        console.log(e);
      }
    }

    return numbers;
  };

  setByNumbers = async (valueType: T, values: Array<number>) => {
    await this.storage.set(valueType, values.join());
  };

  getToObject = async <R extends objectType = objectType>(valueType: T): Promise<R> => {
    let json = {} as R;
    const value = await this.storage.get(valueType);
    if (!value) {
      return json;
    }

    try {
      json = JSON.parse(value) as R;
    } catch (e) {
      console.log(e);
    }
    return json
  };

  setByObject = async (valueType: T, value: objectType) => {
    await this.storage.set(valueType, JSON.stringify(value));
  };
}