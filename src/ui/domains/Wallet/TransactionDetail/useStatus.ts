import gnosLogo from '../../../../assets/gnos-logo.svg';
import gnotLogo from '../../../../assets/gnot-logo.svg';
import success from '../../../../assets/success.svg';
import failed from '../../../../assets/failed.svg';
import theme from '@styles/theme';
import { useEffect, useState } from 'react';

export type Transaction = {
  date: string;
  type: string;
  status: string;
  fromto: string;
  fromtoaddr: string;
  networkFee: string;
  tokenImg: string;
  price: string;
  [key: string]: string;
};

type StatusStyle = {
  color: string;
  statusIcon: string;
};

interface txtype {
  nftImg: string;
  nftType: string;
  account: string;
  amount: string;
  addr: string;
  protoType: txprototype;
}

interface txprototype {
  result_type: string;
  time: string;
  from: string;
  to: string;
  amount: string;
}

export const useStatus = () => {
  const data: Transaction = {
    date: 'May 16, 2022 10:42 am',
    type: 'Send',
    status: 'Success',
    fromto: '',
    fromtoaddr: 'https://ibb.co/jRDjPyW',
    networkFee: '0.000001',
    tokenImg: gnotLogo,
    price: '1,000.1234',
  };
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

  const handleLinkClick = () => window.open('https://gnoscan.io/', '_blank');

  const [tx, setTx] = useState<txtype>();
  const [displayTx, setDisplayTx] = useState<Transaction>({
    date: '',
    type: '',
    status: '',
    fromto: '',
    fromtoaddr: '',
    networkFee: '0.000001',
    tokenImg: gnotLogo,
    price: '',
  });
  useEffect(() => {
    if (tx) {
      const settx = {
        date: '',
        type: '',
        status: '',
        fromto: '',
        fromtoaddr: '',
        networkFee: '0.000001',
        tokenImg: gnotLogo,
        price: '',
      };

      settx.price = tx?.amount as string;

      let time_adjust = new Date(tx?.protoType.time as string);
      const offset = time_adjust.getTimezoneOffset();
      time_adjust = new Date(time_adjust.getTime() - offset * 60 * 1000);
      settx.date =
        time_adjust.toISOString().split('T')[0] +
        ' ' +
        time_adjust.toISOString().split('T')[1].slice(0, 8);

      if (tx?.addr === tx?.protoType.from) {
        settx.fromto = 'To';
        settx.fromtoaddr = tx?.protoType.to.slice(0, 4) + '...' + tx?.protoType.to.slice(-4);
      } else if (tx?.addr === tx?.protoType.to) {
        settx.fromto = 'From';
        settx.fromtoaddr = tx?.protoType.from.slice(0, 4) + '...' + tx?.protoType.from.slice(-4);
      }

      if (tx?.protoType.result_type === 'valid_tx') {
        settx.type = tx?.amount.includes('-') ? 'Send' : 'Deposit';
        settx.status = 'Success';
      } else {
        settx.type = 'Error';
        settx.status = 'Failed';
      }
      setDisplayTx(settx);
    }
  }, [tx]);

  return {
    modelState: {
      model: displayTx,
      color: getStatusStyle(displayTx.status).color,
      statusIcon: getStatusStyle(displayTx.status).statusIcon,
    },
    onLinkClick: handleLinkClick,
    setTx: setTx,
  };
};
