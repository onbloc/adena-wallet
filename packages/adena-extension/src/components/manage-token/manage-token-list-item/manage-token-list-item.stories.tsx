import ManageTokenListItem, { type ManageTokenListItemProps } from './manage-token-list-item';
import { Meta, StoryObj } from '@storybook/react';
import { action } from "@storybook/addon-actions";

export default {
  title: 'components/manage-token/ManageTokenListItem',
  component: ManageTokenListItem,
} as Meta<typeof ManageTokenListItem>;

const token = {
  tokenId: "token1",
  logo: "https://raw.githubusercontent.com/onbloc/adena-resource/main/images/tokens/gnot.svg",
  name: "Gnoland",
  balanceAmount: {
    value: "240,255.241155",
    denom: "GNOT",
  },
  activated: true
};

export const Main: StoryObj<ManageTokenListItemProps> = {
  args: {
    token: {
      ...token,
      main: true
    },
    onToggleActiveItem: action("token item click")
  },
};

export const Activeated: StoryObj<ManageTokenListItemProps> = {
  args: {
    token,
    onToggleActiveItem: action("token item click")
  },
};

export const Deactivated: StoryObj<ManageTokenListItemProps> = {
  args: {
    token: {
      ...token,
      activated: false
    },
    onToggleActiveItem: action("token item click")
  },
};