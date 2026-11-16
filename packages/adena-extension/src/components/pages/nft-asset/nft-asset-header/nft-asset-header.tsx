import React, { useMemo } from 'react';

import LeftArrowIcon from '@assets/arrowL-left.svg';
import IconEtc from '@assets/etc.svg';
import IconHide from '@assets/icon-hide';
import IconLink from '@assets/icon-link';
import IconPin from '@assets/icon-pin';
import IconShow from '@assets/icon-show';
import IconUnpin from '@assets/icon-unpin';
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
        text: 'View on GnoScan',
        icon: <IconLink />,
        onClick: openGnoscanCollection,
      },
      {
        text: pinned ? 'Unpin Collection' : 'Pin Collection',
        icon: pinned ? <IconUnpin /> : <IconPin className='icon-dropdown' />,
        onClick: pinned ? unpinCollection : pinCollection,
      },
      {
        text: visible ? 'Hide Collection' : 'Show Collection',
        icon: visible ? <IconHide className='large' /> : <IconShow className='large' />,
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
