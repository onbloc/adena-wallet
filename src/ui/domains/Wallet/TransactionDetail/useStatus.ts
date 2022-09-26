import success from '../../../../assets/success.svg';
import failed from '../../../../assets/failed.svg';
import theme from '@styles/theme';
import { useEffect, useState } from 'react';

export type Transaction = {
  date: string;
  type: string;
  status: string;
  fee: string;
  img: string;
  send: string;
  desc: string;
  [key: string]: string;
};

type StatusStyle = {
  color: string;
  statusIcon: string;
};

interface txtype {
  protoType: txprototype;
  txDesc: string;
  txImg: string;
  txReason: string;
  txSend: string;
  txStatus: string;
  txType: string;
}

interface txprototype {
  date: string;
  fee: string;
  from: string;
  func: string;
  hash: string;
  height: string;
  result: object;
  send: string;
  to: string;
  amount: string;
  txhash: string;
}

export const useStatus = () => {
  const getStatusStyle = (status: string): StatusStyle => {
    switch (status) {
      case 'Success' || 'Sent':
        return {
          color: theme.color.green[2],
          statusIcon: success,
        };
      case 'Failed':
        return {
          color: theme.color.red[2],
          statusIcon: failed,
        };
      default:
        return {
          color: theme.color.red[2],
          statusIcon: failed,
        };
    }
  };

  const handleLinkClick = (hash: string) => {
    window.open(`https://gnoscan.io/test2/contract/${hash}`, '_blank');
  };

  const [tx, setTx] = useState<txtype>();
  const [displayTx, setDisplayTx] = useState<Transaction>({
    date: '',
    type: '',
    status: '',
    fee: '',
    img: '',
    send: '',
    desc: '',
  });
  useEffect(() => {
    if (tx) {
      const singleTx = {
        status: '',
        img: '',
        send: '',
        date: '',
        type: '',
        fee: '',
        desc: '',
      };

      singleTx.img = tx?.txImg;
      singleTx.send = Number(tx?.txSend) !== 0 ? (tx?.txSend.replace('gnot', '') as string) : '0';

      let time_adjust = new Date(tx?.protoType.date as string);
      const offset = time_adjust.getTimezoneOffset();
      time_adjust = new Date(time_adjust.getTime() - offset * 60 * 1000);
      singleTx.date =
        time_adjust.toISOString().split('T')[0] +
        ' ' +
        time_adjust.toISOString().split('T')[1].slice(0, 8);

      if (tx?.txStatus === 'Success') {
        singleTx.status = 'Success';
      } else {
        singleTx.type = 'Error';
        singleTx.status = 'Failed';
      }

      if (tx?.protoType.fee === undefined) {
        singleTx.fee = '0';
      } else {
        singleTx.fee = tx?.protoType.fee.replace('gnot', '');
      }

      setDisplayTx(singleTx);
    }
  }, [tx]);

  return {
    modelState: {
      model: displayTx,
      // @ts-ignore
      color: getStatusStyle(displayTx.status).color,
      // @ts-ignore
      statusIcon: getStatusStyle(displayTx.status).statusIcon,
    },
    onLinkClick: handleLinkClick,
    setTx: setTx,
  };
};
