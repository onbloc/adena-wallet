import MainTokenList, { type MainTokenListProps } from './main-token-list';
import { Meta, StoryObj } from '@storybook/react';
import { action } from "@storybook/addon-actions";

export default {
  title: 'components/main/MainTokenList',
  component: MainTokenList,
} as Meta<typeof MainTokenList>;

const tokens = [
  {
    tokenId: "token1",
    logo: "https://raw.githubusercontent.com/onbloc/adena-resource/main/images/tokens/gnot.svg",
    name: "Gnoland",
    balanceAmount: {
      value: "240,255.241155",
      denom: "GNOT",
    },
  }, {
    tokenId: "token2",
    logo: "https://avatars.githubusercontent.com/u/118414737?s=200&v=4",
    name: "Gnoswap",
    balanceAmount: {
      value: "252.844",
      denom: "GNOS",
    }
  }
];

export const Default: StoryObj<MainTokenListProps> = {
  args: {
    tokens,
    onClickTokenItem: action("token item click")
  },
};