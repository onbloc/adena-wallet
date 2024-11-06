import { action } from '@storybook/addon-actions';
import { Meta, StoryObj } from '@storybook/react';
import ManageCollectionsButton, {
  type ManageCollectionsButtonProps,
} from './manage-collections-button';

export default {
  title: 'components/nft/ManageCollectionsButton',
  component: ManageCollectionsButton,
} as Meta<typeof ManageCollectionsButton>;

export const Default: StoryObj<ManageCollectionsButtonProps> = {
  args: {
    onClick: action('manage token click'),
  },
};
