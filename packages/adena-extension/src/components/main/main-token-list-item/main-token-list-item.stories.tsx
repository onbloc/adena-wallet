import MainTokenListItem, { type MainTokenListItemProps } from './main-token-list-item';
import { Meta, StoryObj } from '@storybook/react';
import { action } from "@storybook/addon-actions";

export default {
  title: 'components/main/MainTokenListItem',
  component: MainTokenListItem,
} as Meta<typeof MainTokenListItem>;

const token = {
  tokenId: "token1",
  logo: "https://raw.githubusercontent.com/onbloc/adena-resource/main/images/tokens/gnot.svg",
  name: "Gnoland",
  balanceAmount: {
    value: "240,255.241155",
    denom: "GNOT",
  }
};

export const Default: StoryObj<MainTokenListItemProps> = {
  args: {
    token,
    onClickTokenItem: action("token item click")
  },
};