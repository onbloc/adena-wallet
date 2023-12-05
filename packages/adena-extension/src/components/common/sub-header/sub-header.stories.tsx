import React from 'react';
import SubHeader, { type SubHeaderProps } from './sub-header';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import ArrowBackIcon from '@assets/arrowL-left.svg';
import ArrowNextIcon from '@assets/arrowL-right.svg';

export default {
  title: 'components/common/SubHeader',
  component: SubHeader,
} as Meta<typeof SubHeader>;

export const Default: StoryObj<SubHeaderProps> = {
  args: {
    title: 'Send GNOS',
  },
};

export const LeftElement: StoryObj<SubHeaderProps> = {
  args: {
    title: 'Send GNOS',
    leftElement: {
      element: <img src={`${ArrowBackIcon}`} alt='arrow back' />,
      onClick: action('left element click'),
    },
  },
};

export const RightElement: StoryObj<SubHeaderProps> = {
  args: {
    title: 'Send GNOS',
    rightElement: {
      element: <img src={`${ArrowNextIcon}`} alt='arrow next' />,
      onClick: action('right element click'),
    },
  },
};

export const LeftAndRightElement: StoryObj<SubHeaderProps> = {
  args: {
    title: 'Send GNOS',
    leftElement: {
      element: <img src={`${ArrowBackIcon}`} alt='arrow back' />,
      onClick: action('left element click'),
    },
    rightElement: {
      element: <img src={`${ArrowNextIcon}`} alt='arrow next' />,
      onClick: action('right element click'),
    },
  },
};