import React, { ReactNode } from 'react';
import { SubHeaderWrapper } from './sub-header.styles';

export interface SubHeaderProps {
  title: string;
  leftElement?: {
    element: ReactNode;
    onClick: () => void;
  };
  rightElement?: {
    element: ReactNode;
    onClick: () => void;
  };
}

export const SubHeader: React.FC<SubHeaderProps> = ({ title, leftElement, rightElement }) => {
  return (
    <SubHeaderWrapper>
      {leftElement && (
        <div className='icon-wrapper left' onClick={leftElement.onClick}>
          {leftElement.element}
        </div>
      )}

      <h4 className='title-wrapper'>{title}</h4>

      {rightElement && (
        <div className='icon-wrapper right' onClick={rightElement.onClick}>
          {rightElement.element}
        </div>
      )}
    </SubHeaderWrapper>
  );
};
