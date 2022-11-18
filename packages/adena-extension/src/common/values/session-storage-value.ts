type ValueType = 'ENCRYPTED_KEY' | 'ENCRYPTED_PASSWORD' | 'APPROVE_DATA';

export const get = async (valueType: ValueType): Promise<string> => {
  const values = await chrome.storage.session.get(valueType);
  const value = values[`${valueType}`] ?? '';
  return `${value}`;
};

export const set = async (valueType: ValueType, value: string | number) => {
  await chrome.storage.session.set({
    [valueType]: `${value}`,
  });
};

export const remove = async (valueType: ValueType) => {
  await chrome.storage.session.remove(valueType);
};

export const claer = async () => {
  await chrome.storage.session.clear();
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
