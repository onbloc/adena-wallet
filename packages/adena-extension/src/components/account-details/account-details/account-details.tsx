import React, { useCallback } from 'react';
import { AccountDetailsWrapper } from './account-details.styles';
import AccountNameInput from '../account-name-input/account-name-input';
import { QRCodeSVG } from 'qrcode.react';
import CopyButton from '@components/common/copy-button/copy-button';
import FullButtonRightIcon from '@components/buttons/full-button-right-icon';

export interface AccountDetailsProps {
  originName: string;
  name: string;
  address: string;
  moveGnoscan: () => void;
  moveExportPrivateKey: () => void;
  setName: (name: string) => void;
  reset: () => void;
}

const AccountDetails: React.FC<AccountDetailsProps> = ({
  originName,
  name,
  address,
  setName,
  reset,
  moveGnoscan,
  moveExportPrivateKey,
}) => {

  const onClickViewOnGnoscan = useCallback(() => {
    moveGnoscan();
  }, [moveGnoscan]);

  const onClickExportPrivateKey = useCallback(() => {
    moveExportPrivateKey();
  }, [moveExportPrivateKey]);

  return (
    <AccountDetailsWrapper>
      <div className='name-input-wrapper'>
        <AccountNameInput
          originName={originName}
          name={name}
          setName={setName}
          reset={reset}
        />
      </div>

      <div className='qrcode-wrapper'>
        <div className='qrcode-background'>
          <QRCodeSVG value={address} size={150} />
        </div>
        <div className='qrcode-address-wrapper'>
          <span className='address'>{address}</span>
          <CopyButton copyText={address} />
        </div>
      </div>

      <div className='button-group-wrapper'>
        <FullButtonRightIcon
          icon='WEBLINK'
          title={'View on Gnoscan'}
          onClick={onClickViewOnGnoscan}
        />
        <FullButtonRightIcon
          title={'Export Private Key'}
          onClick={onClickExportPrivateKey}
        />
      </div>

    </AccountDetailsWrapper>
  );
};

export default AccountDetails;