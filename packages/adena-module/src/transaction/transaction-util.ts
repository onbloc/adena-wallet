export const uint8ArrayToArray = (uint8Array: Uint8Array): Array<number> => {
  let array: Array<number> = [];
  for (let index = 0; index < uint8Array.byteLength; index++) {
    array[index] = uint8Array[index];
  }

  return array;
};
