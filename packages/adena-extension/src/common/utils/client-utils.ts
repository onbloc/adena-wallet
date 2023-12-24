import gnotLogo from '@assets/gnot-logo.svg';
import contractLogo from '@assets/contract.svg';
import addPkgLogo from '@assets/addpkg.svg';
import success from '@assets/success.svg';
import failed from '@assets/failed.svg';
import theme from '@styles/theme';
import axios, { AxiosResponse } from 'axios';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';

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
  return new Date().getDate() - new Date(d).getDate();
}

export function dateTimeFormatEn(d: Date | string): {
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

export function parseTxsEachDate(txs: object[]): any {
  return txs.reduce((o: any, cur: any) => {
    const k = cur.date.slice(0, 10);
    const currDate = new Date(cur.date);
    const dateDiff = getDateDiff(currDate);
    let formatDate = '';

    if (dateDiff === 0) {
      formatDate = 'Today';
    } else if (dateDiff === 1) {
      formatDate = 'Yesterday';
    } else {
      const result = dateTimeFormatEn(currDate);
      formatDate = `${result.month} ${result.day}, ${result.year}`;
    }

    let txFunc;
    let txDesc;
    if (cur.func === 'Sent') {
      txDesc = `To: ${formatAddress(cur.to, 4)}`;
    } else if (cur.func === 'Received') {
      txDesc = `From: ${formatAddress(cur.from, 4)}`;
    } else if (cur.type === '/vm.m_call') {
      txDesc = `pkg: ${cur.pkg_path}`;
    } else if (cur.type === '/vm.m_addpkg') {
      txFunc = 'AddPkg';
    } else if (cur.type === '/vm.m_run') {
      txDesc = 'Run';
    } else {
      txDesc = '';
    }

    let txLogo;
    if (cur.type === '/bank.MsgSend') {
      txLogo = gnotLogo;
    } else if (cur.type === '/vm.m_call') {
      txLogo = contractLogo;
    } else if (cur.type === '/vm.m_addpkg') {
      txLogo = addPkgLogo;
    } else {
      txLogo = null;
    }

    if (o[k]) {
      if (!isFailedReceive(cur)) {
        o[k].transaction.push({
          txImg: txLogo,
          txStatus: cur.result.status,
          txType: cur.type,
          txFunc: txFunc || cur.func,
          txDesc: txDesc,
          txSend: prettier(cur.send),
          protoType: cur,
        });
      }
    } else {
      if (!isFailedReceive(cur)) {
        o[k] = {
          date: formatDate,
          transaction: [
            {
              txImg: txLogo,
              txStatus: cur.result.status,
              txReason: cur.result.reason,
              txType: cur.type,
              txFunc: txFunc || cur.func,
              txDesc: txDesc,
              txSend: prettier(cur.send),
              protoType: cur,
            },
          ],
        };
      }
    }
    return o;
  }, {});
}

const prettier = (target: any): any => {
  if (target === undefined) {
    return '0';
  } else {
    if (target !== 0) {
      return target.replace('gnot', '');
    } else if (target === 0) {
      return '0';
    }
  }
};

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
  const startStringCheck = /^g1/;
  const atozAndNumberCheck = /^[a-z0-9]{40}$/;
  return startStringCheck.test(v) && atozAndNumberCheck.test(v) ? true : false;
}

export function removeUgly(target: any): any {
  return target.replace('To: ', '').replace('From: ', '').replace('/std.', '');
}

export function getStatusStyle(status: string): { color: string; statusIcon: any } {
  switch (status) {
    case 'SUCCESS':
      return {
        color: theme.green._5,
        statusIcon: success,
      };
    case 'FAIL':
      return {
        color: theme.red._5,
        statusIcon: failed,
      };
    default:
      return {
        color: theme.red._5,
        statusIcon: failed,
      };
  }
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

export const parseParameters = (url: string): { [x: string]: string } => {
  const hash = url.split('?');
  if (hash.length < 2) {
    return {};
  }

  const params: { [key in string]: string } = {};
  for (const hashValue of hash) {
    for (const parameterValue of hashValue.split('&')) {
      const values = parameterValue.split('=');
      if (values.length > 1) {
        const key = values[0];
        const value = values[1];
        params[key] = value;
      }
    }
  }

  return params;
};

export const encodeParameter = (data: { [key in string]: any }): string => {
  try {
    const encodedValue = encodeURI(JSON.stringify(data));
    return toBase64(encodedValue);
  } catch (error) {
    console.log(error);
  }
  return '';
};

export const decodeParameter = (data: string): any => {
  try {
    const decodedValue = JSON.parse(decodeURI(fromBase64(data)));
    return decodedValue;
  } catch (error) {
    console.log(error);
  }
  return {};
};

export const toBase64 = (data: string): string => {
  try {
    return btoa(data);
  } catch (error) {
    console.log(error);
  }
  return '';
};

export const fromBase64 = (data: string): string => {
  try {
    return atob(data);
  } catch (error) {
    console.log(error);
  }
  return '';
};

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

export const createFaviconByHostname = async (hostname: string): Promise<string | null> => {
  try {
    const faviconData = await fetchFavicon(hostname);
    const encodeImageData =
      'data:image/;base64,' + Buffer.from(faviconData, 'binary').toString('base64');
    return encodeImageData;
  } catch (e) {
    console.log(e);
  }
  return null;
};

const fetchFavicon = async (hostname: string): Promise<any> => {
  let response = null;

  response = await fetchArrayData(`https://${hostname}/apple-touch-icon.png`);
  if (response?.data) {
    return response.data;
  }

  response = await fetchArrayData(`https://${hostname}/favicon.ico`);
  if (response?.data) {
    return response.data;
  }

  response = await fetchArrayData(`https://www.google.com/s2/favicons?domain=${hostname}&sz=256`);
  if (response?.data) {
    return response.data;
  }

  return null;
};

const fetchArrayData = (uri: string): Promise<AxiosResponse<any, any> | null> => {
  return axios
    .get(uri, { responseType: 'arraybuffer' })
    .then((response) => (response.headers['content-type'].startsWith('image') ? response : null))
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

const isFailedReceive = (cur: any): boolean => {
  return cur.func === 'Received' && cur.result.status === 'Failed';
};

// TODO: CHECK SSL
export const getSiteName = (protocol: string | undefined, hostname: string | undefined): string => {
  return `${protocol}//${hostname}`;
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

export async function fetchHealth(url: string): Promise<{ url: string; healthy: boolean }> {
  const healthy = await axios
    .get(url + '/health', { adapter: fetchAdapter, timeout: 5000 })
    .then((response) => response.status === 200)
    .catch(() => false);
  return {
    url,
    healthy,
  };
}
