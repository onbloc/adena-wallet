import IconEtc from '@assets/icon-etc';
import IconLink from '@assets/icon-link';
import IconQRCode from '@assets/icon-qrcode';
import { Text } from '@components/atoms';
import OptionDropdown from '@components/atoms/option-dropdown/option-dropdown';
import React, { useMemo } from 'react';
import { NFTHeaderWrapper } from './nft-header.styles';

export interface NFTHeaderProps {}

const NFTHeader: React.FC<NFTHeaderProps> = () => {
  const dropdownOptions = useMemo(
    () => [
      {
        text: 'View on Gnoscan',
        icon: <IconLink />,
        onClick: () => console.log('View on Gnoscan'),
      },
      {
        text: 'View on Gnoscan',
        icon: <IconQRCode />,
        onClick: () => console.log('View on Gnoscan'),
      },
    ],
    [],
  );

  return (
    <NFTHeaderWrapper>
      <Text type='header4'>NFTs</Text>
      <OptionDropdown buttonNode={<IconEtc />} options={dropdownOptions} hover />
    </NFTHeaderWrapper>
  );
};

export default NFTHeader;
