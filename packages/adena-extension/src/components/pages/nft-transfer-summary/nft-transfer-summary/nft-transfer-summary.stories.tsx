import { action } from '@storybook/addon-actions';
import { Meta, StoryObj } from '@storybook/react';
import { UseQueryResult } from '@tanstack/react-query';
import NFTTransferSummary, { type NFTTransferSummaryProps } from './nft-transfer-summary';

export default {
  title: 'components/transfer/NFTTransferSummary',
  component: NFTTransferSummary,
} as Meta<typeof NFTTransferSummary>;

export const Default: StoryObj<NFTTransferSummaryProps> = {
  args: {
    isErrorNetworkFee: false,
    grc721Token: {
      metadata: null,
      name: '',
      networkId: '',
      packagePath: '',
      symbol: '',
      tokenId: '',
      type: 'grc721',
      isMetadata: true,
      isTokenUri: true,
    },
    queryGRC721TokenUri: () => ({}) as unknown as UseQueryResult<string | null>,
    toAddress: 'g1fnakf9vrd6uqn8qdmp88yac4p0ngy572answ9f',
    networkFee: {
      amount: '0.0048',
      denom: 'GNOT',
    },
    onClickBack: action('click back'),
    onClickCancel: action('click cancel'),
    onClickSend: action('click send'),
  },
  render: (args) => (
    <div style={{ height: '500px' }}>
      <NFTTransferSummary {...args} />
    </div>
  ),
};
