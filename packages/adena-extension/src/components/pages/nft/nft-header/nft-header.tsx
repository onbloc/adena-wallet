import IconEtc from '@assets/etc.svg';
import IconLink from '@assets/icon-link';
import IconQRCode from '@assets/icon-qrcode';
import { Text } from '@components/atoms';
import OptionDropdown from '@components/atoms/option-dropdown/option-dropdown';
import React, { useMemo } from 'react';
import { NFTHeaderWrapper } from './nft-header.styles';

export interface NFTHeaderProps {
  openGnoscan: () => void;
  moveDepositPage: () => void;
  isSessionAccount?: boolean;
}

const NFTHeader: React.FC<NFTHeaderProps> = ({
  openGnoscan,
  moveDepositPage,
  isSessionAccount = false,
}) => {
  const dropdownOptions = useMemo(() => {
    const gnoscanOption = {
      text: 'View on GnoScan',
      icon: <IconLink />,
      onClick: openGnoscan,
    };

    // A SessionAccount address can never receive tokens, so the deposit entry
    // point is hidden; users deposit NFTs to the Master Account instead.
    if (isSessionAccount) {
      return [gnoscanOption];
    }

    return [
      {
        text: 'Deposit NFT',
        icon: <IconQRCode />,
        onClick: moveDepositPage,
      },
      gnoscanOption,
    ];
  }, [openGnoscan, moveDepositPage, isSessionAccount]);

  return (
    <NFTHeaderWrapper>
      <Text type='header4'>NFTs</Text>
      <OptionDropdown
        buttonNode={<img src={IconEtc} alt='icon-etc' />}
        options={dropdownOptions}
        hover
      />
    </NFTHeaderWrapper>
  );
};

export default NFTHeader;
