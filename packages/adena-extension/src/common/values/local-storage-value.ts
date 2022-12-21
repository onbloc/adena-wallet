type ValueType =
  | 'SERIALIZED'
  | 'WALLET_ACCOUNT_PATHS'
  | 'WALLET_ACCOUNT_NAMES'
  | 'CURRENT_ACCOUNT_ADDRESS'
  | 'CURRENT_CHAIN_ID'
  | 'ESTABLISH_SITES'
  | 'ADDRESS_BOOK'
  | 'WALLET_ACCOUNTS';

export const get = async (valueType: ValueType): Promise<string> => {
  const values = await chrome.storage.local.get(valueType);
  const value = values[`${valueType}`] ?? '';
  return `${value}`;
};

export const set = async (valueType: ValueType, value: string | number) => {
  await chrome.storage.local.set({
    [valueType]: `${value}`,
  });
};

export const remove = async (valueType: ValueType) => {
  await chrome.storage.local.remove(valueType);
};

export const claer = async () => {
  await chrome.storage.local.clear();
};

export const getToNumbers = async (valueType: ValueType): Promise<Array<number>> => {
  const numbers: Array<number> = [];
  const value = await get(valueType);

  if (value && value !== '') {
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
  }

  return numbers;
};

export const setByNumbers = async (valueType: ValueType, values: Array<number>) => {
  await set(valueType, values.join());
};

type objectType = { [key in string]: any };

export const getToObject = async <T extends objectType = objectType>(valueType: ValueType): Promise<T> => {
  try {
    const value = await get(valueType);
    if (value && value !== '') {
      return JSON.parse(value) as T;
    }
  } catch (e) {
    console.log(e);
  }

  return {} as T;
};

export const setByObject = async (valueType: ValueType, value: objectType) => {
  await set(valueType, JSON.stringify(value));
};
