import React, { useCallback, useState } from 'react';
import TransferInput from '@components/transfer/transfer-input/transfer-input';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';

const tokenMetainfo = {
  main: true,
  tokenId: 'Gnoland',
  name: 'Gnoland',
  chainId: 'GNOLAND',
  networkId: 'test3',
  image: 'https://raw.githubusercontent.com/onbloc/adena-resource/main/images/tokens/gnot.svg',
  pkgPath: '',
  symbol: 'GNOT',
  type: 'NATIVE' as 'GRC20' | 'NATIVE',
  decimals: 6,
  denom: 'GNOT',
  minimalDenom: 'ugnot',
};

const balanceInput = {
  hasError: false,
  amount: '132123123123',
  denom: 'GNOT',
  description: 'Insufficient balance',
  onChangeAmount: () => { return; },
  onClickMax: () => { return; },
};

const addressInput = {
  opened: false,
  hasError: false,
  errorMessage: 'Invalid address',
  selected: false,
  selectedName: '',
  selectedDescription: '(g1ff...jpae)',
  address: '',
  addressBookInfos: [],
  onClickInputIcon: () => { return; },
  onChangeAddress: () => { return; },
  onClickAddressBook: () => { return; },
};

const TransferInputContainer: React.FC = () => {
  const navigate = useNavigate();
  const [openedAddressBook, setOpenedAddressBook] = useState(false);

  const onClickCancel = useCallback(() => {
    navigate(-1);
  }, []);

  const onClickNext = useCallback(() => {
    navigate(RoutePath.TransferSummary);
  }, []);

  return (
    <TransferInput
      tokenMetainfo={tokenMetainfo}
      addressInput={addressInput}
      balanceInput={balanceInput}
      isNext={true}
      onClickCancel={onClickCancel}
      onClickNext={onClickNext}
    />
  );
};

export default TransferInputContainer;