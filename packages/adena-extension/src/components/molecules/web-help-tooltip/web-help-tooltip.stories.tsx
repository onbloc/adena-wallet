import React, { PropsWithChildren } from 'react';
import { Meta, StoryObj } from '@storybook/react';

import WebHelpTooltip, { type WebHelpTooltipProps } from './web-help-tooltip';

export default {
  title: 'components/molecules/WebHelpTooltip',
  component: WebHelpTooltip,
} as Meta<typeof WebHelpTooltip>;

export const Default: StoryObj<PropsWithChildren<WebHelpTooltipProps>> = {
  args: {
    securityRate: 2,
    convenienceRate: 2,
    children: (
      <>
        This allows you to connect with accounts from <b>hardware wallets.</b>
      </>
    ),
  },
};
