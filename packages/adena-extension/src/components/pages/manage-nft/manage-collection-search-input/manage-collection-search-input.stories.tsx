import { action } from '@storybook/addon-actions';
import { Meta, StoryObj } from '@storybook/react';
import ManageCollectionSearchInput, {
  type ManageCollectionSearchInputProps,
} from './manage-collection-search-input';

export default {
  title: 'components/manage-nft/ManageCollectionSearchInput',
  component: ManageCollectionSearchInput,
} as Meta<typeof ManageCollectionSearchInput>;

export const Default: StoryObj<ManageCollectionSearchInputProps> = {
  args: {
    keyword: '',
    onChangeKeyword: action('change keywords'),
  },
};
