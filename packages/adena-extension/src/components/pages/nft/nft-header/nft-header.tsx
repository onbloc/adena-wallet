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
}

const NFTHeader: React.FC<NFTHeaderProps> = ({ openGnoscan, moveDepositPage }) => {
  const dropdownOptions = useMemo(
    () => [
      {
        text: 'Deposit NFT',
        icon: <IconQRCode />,
        onClick: moveDepositPage,
      },
      {
        text: 'View on Gnoscan',
        icon: <IconLink />,
        onClick: openGnoscan,
      },
    ],
    [openGnoscan, moveDepositPage],
  );

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
