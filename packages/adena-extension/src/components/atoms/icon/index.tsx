import React, { ReactElement } from 'react';
import {
  IconWallet,
  IconGallery,
  IconSearch,
  IconClock,
  IconSetting,
  IconAddressBookLarge,
  IconAddressBookSmall,
  IconCancel,
  IconArrowV2,
  IconWebLink,
  IconHiddenEye,
  IconConnectLoading,
  IconConnectFailed,
  IconTokenAdded,
  IconSpinnerLoading,
} from './icon-assets';

export type IconName = keyof typeof ICONS;

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  className?: string;
}

const ICONS = {
  iconWallet: IconWallet,
  iconGallery: IconGallery,
  iconSearch: IconSearch,
  iconClock: IconClock,
  iconSetting: IconSetting,
  iconAddressBookLarge: IconAddressBookLarge,
  iconAddressBookSmall: IconAddressBookSmall,
  iconCancel: IconCancel,
  iconArrowV2: IconArrowV2,
  iconWebLink: IconWebLink,
  iconHiddenEye: IconHiddenEye,
  iconConnectLoading: IconConnectLoading,
  iconConnectFailed: IconConnectFailed,
  iconTokenAdded: IconTokenAdded,
  iconSpinnerLoading: IconSpinnerLoading,
} as const;

export const Icon = ({ name, className = '', ...rest }: IconProps): ReactElement => {
  return React.createElement(ICONS[name], { className, ...rest });
};
