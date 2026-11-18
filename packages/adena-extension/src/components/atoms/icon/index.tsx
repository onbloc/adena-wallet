import React, { ReactElement } from 'react';

import {
  IconAddressBookLarge,
  IconAddressBookSmall,
  IconAdenaMark,
  IconArrowV2,
  IconBook,
  IconCancel,
  IconClock,
  IconConnectFailed,
  IconConnectLoading,
  IconGallery,
  IconGlobe,
  IconHiddenEye,
  IconHome,
  IconLock,
  IconMapRoute,
  IconSearch,
  IconSecurity,
  IconSetting,
  IconSpinnerLoading,
  IconTokenAdded,
  IconWebLink,
} from './icon-assets';

export type IconName = keyof typeof ICONS;

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  className?: string;
}

const ICONS = {
  iconHome: IconHome,
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
  iconLock: IconLock,
  iconGlobe: IconGlobe,
  iconMapRoute: IconMapRoute,
  iconBook: IconBook,
  iconSecurity: IconSecurity,
  iconAdenaMark: IconAdenaMark,
} as const;

export const Icon = ({ name, className = '', ...rest }: IconProps): ReactElement => {
  return React.createElement(ICONS[name], { className, ...rest });
};
