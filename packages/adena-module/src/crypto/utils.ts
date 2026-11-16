// See https://github.com/paulmillr/noble-hashes/issues/25 for why this is needed
export function toRealUint8Array(data: ArrayLike<number>): Uint8Array {
  if (data instanceof Uint8Array) return data;
  else return Uint8Array.from(data);
}
export function mergeUintArray(...arraies: Array<Uint8Array | number>): Uint8Array {
  const mappedUintArray = arraies.map(array => {
    if (array instanceof Uint8Array) return array;
    return Uint8Array.from([array]);
  });
  const totalLength = mappedUintArray.reduce((accumulator, current) => current.length + accumulator, 0);
  const result = new Uint8Array(totalLength);
  let index = 0;
  for (const array of mappedUintArray) {
    result.set(array, index);
    index += array.length;
  }
  return result;
}
