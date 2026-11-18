import React from 'react';
import { SubHeader, type SubHeaderProps } from '.';
import { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import ArrowBackIcon from '@assets/arrowL-left.svg';
import ArrowNextIcon from '@assets/arrowL-right.svg';

export default {
  title: 'components/common/SubHeader',
  component: SubHeader,
} as Meta<typeof SubHeader>;

export const Default: StoryObj<SubHeaderProps> = {
  args: {
    title: 'Send GNS',
  },
};

export const LeftElement: StoryObj<SubHeaderProps> = {
  args: {
    title: 'Send GNS',
    leftElement: {
      element: <img src={`${ArrowBackIcon}`} alt='arrow back' />,
      onClick: action('left element click'),
    },
  },
};

export const RightElement: StoryObj<SubHeaderProps> = {
  args: {
    title: 'Send GNS',
    rightElement: {
      element: <img src={`${ArrowNextIcon}`} alt='arrow next' />,
      onClick: action('right element click'),
    },
  },
};

export const LeftAndRightElement: StoryObj<SubHeaderProps> = {
  args: {
    title: 'Send GNS',
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
