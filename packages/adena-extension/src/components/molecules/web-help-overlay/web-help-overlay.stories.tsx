import React from 'react';
import WebHelpOverlay, { type WebHelpOverlayProps } from './web-help-overlay';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/molecules/WebHelpOverlay',
  component: WebHelpOverlay,
} as Meta<typeof WebHelpOverlay>;

export const Default: StoryObj<WebHelpOverlayProps> = {
  args: {
    items: [
      {
        x: 5,
        y: 5,
        tooltipInfo: {
          securityRate: 2,
          convenienceRate: 2,
          content: (
            <>
              1. <b>Tooltip</b>
            </>
          ),
        },
      },
      {
        x: 15,
        y: 5,
        tooltipInfo: {
          securityRate: 2,
          convenienceRate: 2,
          content: (
            <>
              2. <b>Tooltip</b>
            </>
          ),
        },
      },
      {
        x: 25,
        y: 5,
        tooltipInfo: {
          securityRate: 2,
          convenienceRate: 2,
          content: (
            <>
              3. <b>Tooltip</b>
            </>
          ),
        },
      },
    ],
    onFinish: action('finish'),
  },
};
