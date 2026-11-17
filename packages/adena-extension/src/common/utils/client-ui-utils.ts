// Helpers that return UI assets (icons, theme colours). Kept apart from
// client-utils so code shared with the mobile app does not load them.
import addPkgLogo from '@assets/addpkg.svg';
import contractLogo from '@assets/contract.svg';
import failed from '@assets/failed.svg';
import gnotLogo from '@assets/icons/tokens/gnot.svg';
import success from '@assets/success.svg';
import theme from '@styles/theme';

import { dateTimeFormatEn, formatAddress, getDateDiff } from './client-utils';

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

const isFailedReceive = (cur: any): boolean => {
  return cur.func === 'Received' && cur.result.status === 'Failed';
};

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
