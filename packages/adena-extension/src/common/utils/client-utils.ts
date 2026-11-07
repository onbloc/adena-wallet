import { validateAddress } from 'adena-module';
import axios, { AxiosResponse } from 'axios';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';

// Re-exported for existing callers; dApp message handling imports the module
// directly so it does not pull in this file's UI assets.
export {
  decodeParameter,
  encodeParameter,
  fromBase64,
  getSiteName,
  parseParameters,
  toBase64,
} from './url-parameter-utils';

export function formatHash(hash: string, num?: number): string {
  const length = num ?? 4;
  return hash.length < 8 ? hash : `${hash.slice(0, length)}...${hash.slice(-length)}`;
}

export function formatAddress(v: string, num?: number): string {
  const length = num ?? 4;
  return v.length < 40 ? v : `${v.slice(0, length)}...${v.slice(-length)}`;
}

export function formatNickname(v: string, num: number): string {
  return v.length > num ? `${v.slice(0, num)}..` : v;
}

export function formatFullNickname(name: string, address: string): string {
  const resultName = formatNickname(name, 10);
  const resultAddr = formatAddress(address);
  return `${resultName} (${resultAddr})`;
}

export function getDateDiff(d: Date | string): number {
  if (!d) {
    return 0;
  }
  return new Date().getDate() - new Date(d).getDate();
}

export function dateTimeFormatEn(
  d: Date | string,
): {
  year: string;
  month: string;
  day: string;
  time: string;
} {
  const currDate = new Date(d);
  const year = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(currDate);
  const month = new Intl.DateTimeFormat('en', { month: 'short' }).format(currDate);
  const day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(currDate);
  const time = new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(currDate);
  return {
    year,
    month,
    day,
    time,
  };
}

export function fullDateFormat(d: Date | string): string {
  const currDate = new Date(d);
  const result = dateTimeFormatEn(currDate);
  return `${result.month} ${result.day}, ${result.year} ${result.time}`;
}

export function minifyStatus(status: string): string {
  if (status === 'Success') {
    return 'S';
  } else {
    return 'F';
  }
}

export function numberWithCommas(value: number, fixed?: number): string {
  const currentFixed = fixed ?? 0;
  const fixedValue = value > 0 ? value.toFixed(currentFixed) : value;
  const parts = fixedValue.toString().split('.');
  const decimal = parts[1] && Number(parts[1]) > 0 ? '.' + parts[1] : '';
  return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + decimal;
}

export function addressValidationCheck(v: string): boolean {
  return validateAddress(v);
}

export function removeUgly(target: any): any {
  return target.replace('To: ', '').replace('From: ', '').replace('/std.', '');
}

export function minFractionDigits(v: number | string, minDigits: number): string {
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: minDigits });
}

export function maxFractionDigits(v: number | string, maxDigits: number): string {
  return Number(v).toLocaleString('en-US', { maximumFractionDigits: maxDigits });
}

export function parseFloatNum(v: number | string, fixed: number): string {
  return parseFloat(Number(v).toFixed(fixed)).toLocaleString();
}

export function searchTextFilter(target: string, searchText: string): boolean {
  return target.toLocaleLowerCase().includes(searchText.toLocaleLowerCase());
}

export function amountSetSymbol(v: number | string, full?: boolean): string {
  if (v === '0' || v === 0) {
    return String(v);
  } else if (String(v).includes('-')) {
    return full ? minFractionDigits(v, 6) : maxFractionDigits(v, 6);
  } else {
    return full ? `+${minFractionDigits(v, 6)}` : `+${maxFractionDigits(v, 6)}`;
  }
}

export function funcTextFilter(v: string): 'Send' | 'Receive' | undefined {
  if (['Sent', 'Failed'].includes(v)) {
    return 'Send';
  }
  if (v === 'Received') {
    return 'Receive';
  } else v;
}

export const createImageByURI = async (uri: string): Promise<string | null> => {
  try {
    const imageData = await fetchArrayData(uri);
    const encodeImageData =
      'data:image/svg+xml;base64,' + Buffer.from(imageData?.data, 'binary').toString('base64');
    return encodeImageData;
  } catch (e) {
    console.log(e);
  }
  return null;
};

export const createFaviconByHostname = async (baseUrl: string): Promise<string | null> => {
  if (!/^https?:\/\//.test(baseUrl)) {
    return null;
  }

  try {
    const faviconData = await fetchFavicon(baseUrl);
    return faviconData;
  } catch (e) {
    console.log(e);
  }
  return null;
};

const fetchFavicon = async (baseUrl: string): Promise<any> => {
  let response = null;

  response = await fetchArrayData(`${baseUrl}/apple-touch-icon.png`);
  if (response?.data) {
    return `${baseUrl}/apple-touch-icon.png`;
  }

  response = await fetchArrayData(`${baseUrl}/favicon.svg`);
  if (response?.data) {
    return `${baseUrl}/favicon.svg`;
  }

  response = await fetchArrayData(`${baseUrl}/favicon.ico`);
  if (response?.data) {
    return `${baseUrl}/favicon.ico`;
  }

  response = await fetchArrayData(
    `https://www.google.com/s2/favicons?domain=${baseUrl.replace('https://', '')}&sz=256`,
  );
  if (response?.data) {
    return `https://www.google.com/s2/favicons?domain=${baseUrl.replace('https://', '')}&sz=256`;
  }

  return null;
};

const fetchArrayData = (uri: string): Promise<AxiosResponse<any, any> | null> => {
  return axios
    .get(uri, { responseType: 'arraybuffer' })
    .then((response) => {
      const contentType = response.headers['content-type'];
      return typeof contentType === 'string' && contentType.startsWith('image') ? response : null;
    })
    .catch(() => null);
};

export const createImageDataBySvg = async (imageUri: string): Promise<string | null> => {
  try {
    const response = await axios.get(imageUri, { responseType: 'arraybuffer' });
    const imageData =
      'data:image/svg+xml;base64,' + Buffer.from(response.data, 'binary').toString('base64');
    return imageData;
  } catch (e) {
    console.log(e);
  }
  return null;
};

export const optimizeNumber = (value: BigNumber, multiply: BigNumber): BigNumber => {
  const decimalPosition = multiply.toString().indexOf('.');
  const decimalLength = decimalPosition > -1 ? `${multiply}`.substring(decimalPosition).length : 0;
  const extraValue = Math.pow(10, decimalLength);
  const currentAmount = value.multipliedBy(multiply).multipliedBy(extraValue).dividedBy(extraValue);
  return currentAmount;
};

export const dateToLocal = (utcDateStr: string): { value: string; offsetHours: number } => {
  const hasTimezone = `${utcDateStr}`.includes('Z');
  const timezoneOffset = new Date().getTimezoneOffset();
  let currentDate = dayjs(utcDateStr);
  if (!hasTimezone) {
    currentDate = currentDate.subtract(timezoneOffset, 'minutes');
  }
  return {
    value: currentDate.format('YYYY-MM-DD HH:mm:ss'),
    offsetHours: -timezoneOffset / 60,
  };
};

export const getDateText = (date: string): string => {
  if (!date) {
    return 'Today';
  }
  const currentDate = new Date(date);
  const today = dateTimeFormatEn(new Date());
  const result = dateTimeFormatEn(currentDate);

  let formatDate = '';
  if (today.year === result.year && today.month === result.month && today.day === result.day) {
    formatDate = 'Today';
  } else {
    formatDate = `${result.month} ${result.day}, ${result.year}`;
  }
  return formatDate;
};

export const getDateTimeText = (date: string): string => {
  const currentDate = new Date(date);
  const result = dateTimeFormatEn(currentDate);
  const formatDate = `${result.month} ${result.day}, ${result.year} ${result.time}`;
  return formatDate;
};
