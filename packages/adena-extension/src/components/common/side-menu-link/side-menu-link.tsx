import React from 'react';
import { SideMenuLinkWrapper } from './side-menu-link.styles';

export interface SideMenuLinkProps {
  icon: string;
  text: string;
  onClick: () => void;
}

const SideMenuLink: React.FC<SideMenuLinkProps> = ({
  icon,
  text,
  onClick,
}) => {
  return (
    <SideMenuLinkWrapper onClick={onClick}>
      <img className='icon' src={icon} alt='icon' />
      <span className='title'>{text}</span>
    </SideMenuLinkWrapper>
  );
};

export default SideMenuLink;