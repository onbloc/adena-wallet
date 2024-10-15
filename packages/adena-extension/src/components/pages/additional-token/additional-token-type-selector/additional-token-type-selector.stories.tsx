import { Meta, StoryObj } from '@storybook/react';
import AdditionalTokenTypeSelector, {
  type AdditionalTokenTypeSelectorProps,
} from './additional-token-type-selector';

export default {
  title: 'components/manage-token/AdditionalTokenTypeSelector',
  component: AdditionalTokenTypeSelector,
} as Meta<typeof AdditionalTokenTypeSelector>;

export const Default: StoryObj<AdditionalTokenTypeSelectorProps> = {
  args: {},
};
