import React from 'react';
import {
  IconWallet,
  IconGallery,
  IconSearch,
  IconClock,
  IconSetting,
  IconAddressBookLarge,
  IconAddressBookSmall,
  IconCancel,
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
} as const;

const Icon = ({ name, className = '', ...rest }: IconProps) => {
  return React.createElement(ICONS[name], { className, ...rest });
};

export default Icon;
