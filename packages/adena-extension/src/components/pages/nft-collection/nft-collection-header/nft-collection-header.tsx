import React, { useMemo } from 'react';

import LeftArrowIcon from '@assets/arrowL-left.svg';
import IconEtc from '@assets/etc.svg';
import IconLink from '@assets/icon-link';
import { SubHeader } from '@components/atoms';
import OptionDropdown from '@components/atoms/option-dropdown/option-dropdown';

export interface NFTCollectionHeaderProps {
  title: string;
  moveBack: () => void;
  openGnoscanCollection: () => void;
}

const NFTCollectionHeader: React.FC<NFTCollectionHeaderProps> = ({
  title,
  moveBack,
  openGnoscanCollection,
}) => {
  const dropdownOptions = useMemo(
    () => [
      {
        text: 'View on Gnoscan',
        icon: <IconLink />,
        onClick: openGnoscanCollection,
      },
    ],
    [],
  );

  return (
    <SubHeader
      title={title}
      leftElement={{
        element: <img src={LeftArrowIcon} alt={'back icon'} />,
        onClick: moveBack,
      }}
      rightElement={{
        element: (
          <OptionDropdown
            buttonNode={<img src={IconEtc} alt='icon-etc' />}
            options={dropdownOptions}
            hover
          />
        ),
        onClick: (): void => {
          return;
        },
      }}
    />
  );
};

export default NFTCollectionHeader;
