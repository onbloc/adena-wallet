import { fromBech32 } from 'adena-module';
import { formatAddress } from './client-utils';

export const convertTextToAmount = (text: string): { value: string; denom: string } | null => {
  try {
    const balance = text
      .trim()
      // eslint-disable-next-line quotes
      .replace('"', '')
      .match(/[a-zA-Z]+|[0-9]+(?:\.[0-9]+|)/g);

    if (!balance || balance.length < 2) {
      throw new Error('Parse error');
    }

    const value = balance.length > 0 ? balance[0] : '0';
    const denom = balance.length > 1 ? balance[1] : '';
    return { value, denom };
  } catch (e) {
    return null;
  }
};

export const makeQueryString = (parameters: { [key in string]: string }): string => {
  return Object.entries(parameters)
    .map((entry) => `${entry[0]}=${entry[1]}`)
    .join('&');
};

export const makeDisplayPackagePath = (packagePath: string): string => {
  const items = packagePath.split('/');
  return items.map((item) => (isBech32Address(item) ? formatAddress(item, 4) : item)).join('/');
};

const isBech32Address = (str: string): boolean => {
  try {
    const { prefix } = fromBech32(str);
    return !!prefix;
  } catch {
    return false;
  }
};

export function calculateByteSize(str: string): number {
  const encoder = new TextEncoder();
  const encodedStr = encoder.encode(str);
  return encodedStr.length;
}
