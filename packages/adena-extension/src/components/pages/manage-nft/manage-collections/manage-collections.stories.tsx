import { action } from 'storybook/actions';
import { Meta, StoryObj } from '@storybook/react-vite';
import ManageCollections, { type ManageCollectionsProps } from './manage-collections';

export default {
  title: 'components/manage-nft/ManageCollections',
  component: ManageCollections,
} as Meta<typeof ManageCollections>;

export const Default: StoryObj<ManageCollectionsProps> = {
  args: {
    collections: [],
    keyword: '',
    onClickClose: action('click close'),
    onChangeKeyword: action('change keyword'),
    onToggleActiveItem: action('toggle item'),
  },
};
