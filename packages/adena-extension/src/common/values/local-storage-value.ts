type ValueType =
  | 'SERIALIZED'
  | 'WALLET_ACCOUNT_PATHS'
  | 'WALLET_ACCOUNT_NAMES'
  | 'CURRENT_ACCOUNT_ADDRESS'
  | 'CURRENT_CHAIN_ID'
  | 'ESTABLISH_SITES'
  | 'ADDRESS_BOOK';

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

export const getToObject = async (valueType: ValueType) => {
  let object: { [key in string]: any } = {};
  const value = await get(valueType);
  try {
    if (value && value !== '') {
      object = JSON.parse(value);
    }
  } catch (e) {
    console.log(e);
  }

  return object;
};

export const setByObject = async (valueType: ValueType, value: { [key in string]: any }) => {
  await set(valueType, JSON.stringify(value));
};
