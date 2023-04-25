import React, { useCallback } from 'react';
import TransferSummary from '@components/transfer/transfer-summary/transfer-summary';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';

const datas = {
  tokenImage: 'https://raw.githubusercontent.com/onbloc/adena-resource/main/images/tokens/gnot.svg',
  transferBalance: '4,000 GNOT',
  toAddress: 'g1fnakf9vrd6uqn8qdmp88yac4p0ngy572answ9f',
  networkFee: {
    value: '0.0048',
    denom: 'GNOT'
  },
};

const TransferSummaryContainer: React.FC = () => {

  const navigate = useNavigate();

  const onClickCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const onClickSend = useCallback(() => {
    navigate(RoutePath.History);
  }, [navigate, datas]);

  return (
    <TransferSummary
      {...datas}
      onClickCancel={onClickCancel}
      onClickSend={onClickSend}
    />
  );
};

export default TransferSummaryContainer;