import { WarningBox, type WarningBoxProps } from '.';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/common/WarningBox',
  component: WarningBox,
} as Meta<typeof WarningBox>;

export const ApproachPassword: StoryObj<WarningBoxProps> = {
  args: { type: 'approachPassword', margin: '5px 5px', padding: '5px 5px' },
};

export const ApproachPrivate: StoryObj<WarningBoxProps> = {
  args: { type: 'approachPrivate', margin: '5px 5px', padding: '5px 5px' },
};

export const RevealPassword: StoryObj<WarningBoxProps> = {
  args: { type: 'revealPassword', margin: '5px 5px', padding: '5px 5px' },
};

export const RevealPrivate: StoryObj<WarningBoxProps> = {
  args: { type: 'revealPrivate', margin: '5px 5px', padding: '5px 5px' },
};
