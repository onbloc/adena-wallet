import React, { useMemo } from 'react';

import LeftArrowIcon from '@assets/arrowL-left.svg';
import IconEtc from '@assets/etc.svg';
import IconLink from '@assets/icon-link';
import { SubHeader } from '@components/atoms';
import OptionDropdown from '@components/atoms/option-dropdown/option-dropdown';

export interface NFTAssetHeaderProps {
  title: string;
  pinned: boolean;
  visible: boolean;
  moveBack: () => void;
  openGnoscanCollection: () => void;
  pinCollection: () => void;
  unpinCollection: () => void;
  showCollection: () => void;
  hideCollection: () => void;
}

const NFTAssetHeader: React.FC<NFTAssetHeaderProps> = ({
  title,
  pinned,
  visible,
  moveBack,
  openGnoscanCollection,
  pinCollection,
  unpinCollection,
  showCollection,
  hideCollection,
}) => {
  const dropdownOptions = useMemo(
    () => [
      {
        text: 'View on Gnoscan',
        icon: <IconLink />,
        onClick: openGnoscanCollection,
      },
      {
        text: pinned ? 'Unpin Collection' : 'Pin Collection',
        icon: <IconLink />,
        onClick: pinned ? unpinCollection : pinCollection,
      },
      {
        text: visible ? 'Hide Collection' : 'Show Collection',
        icon: <IconLink />,
        onClick: visible ? hideCollection : showCollection,
      },
    ],
    [pinned, visible, openGnoscanCollection],
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

export default NFTAssetHeader;
