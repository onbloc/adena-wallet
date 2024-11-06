import { CopyIconButton, FullButtonRightIcon } from '@components/atoms';
import { QRCodeSVG } from 'qrcode.react';
import React, { useCallback } from 'react';
import AccountNameInput from '../account-name-input';
import { AccountDetailsWrapper } from './account-details.styles';

export interface AccountDetailsProps {
  hasPrivateKey: boolean;
  hasSeedPhrase: boolean;
  originName: string;
  name: string;
  address: string;
  moveGnoscan: () => void;
  moveRevealSeedPhrase: () => void;
  moveExportPrivateKey: () => void;
  setName: (name: string) => void;
  reset: () => void;
}

const AccountDetails: React.FC<AccountDetailsProps> = ({
  hasPrivateKey,
  hasSeedPhrase,
  originName,
  name,
  address,
  setName,
  reset,
  moveGnoscan,
  moveRevealSeedPhrase,
  moveExportPrivateKey,
}) => {
  const onClickViewOnGnoscan = useCallback(() => {
    moveGnoscan();
  }, [moveGnoscan]);

  const onClickExportPrivateKey = useCallback(() => {
    if (!hasPrivateKey) {
      return;
    }
    moveExportPrivateKey();
  }, [hasPrivateKey, moveExportPrivateKey]);

  const onClickRevealSeedPhrase = useCallback(() => {
    if (!hasSeedPhrase) {
      return;
    }
    moveRevealSeedPhrase();
  }, [hasSeedPhrase, moveRevealSeedPhrase]);

  return (
    <AccountDetailsWrapper>
      <div className='name-input-wrapper'>
        <AccountNameInput originName={originName} name={name} setName={setName} reset={reset} />
      </div>

      <div className='qrcode-wrapper'>
        <div className='qrcode-background'>
          <QRCodeSVG value={address} size={150} />
        </div>
        <div className='qrcode-address-wrapper'>
          <span className='address'>{address}</span>
          <CopyIconButton copyText={address} />
        </div>
      </div>

      <div className='button-group-wrapper'>
        <FullButtonRightIcon
          icon='WEBLINK'
          title={'View on Gnoscan'}
          onClick={onClickViewOnGnoscan}
        />
        <FullButtonRightIcon
          disabled={!hasPrivateKey}
          title={'Export Private Key'}
          onClick={onClickExportPrivateKey}
        />
        <FullButtonRightIcon
          disabled={!hasSeedPhrase}
          title={'Reveal Seed Phrase'}
          onClick={onClickRevealSeedPhrase}
        />
      </div>
    </AccountDetailsWrapper>
  );
};

export default AccountDetails;
