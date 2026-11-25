import React, { ReactElement } from 'react';

import { Badge, Button, Icon } from '../../atoms';
import { ListRow, Screen, SectionLabel, TopBar } from '../../molecules';

export interface NetworkListItem {
  id: string;
  name: string;
  detail: string;
  selected: boolean;
  isCustom: boolean;
  isTestnet: boolean;
}

export interface NetworksPageProps {
  networks: NetworkListItem[];
  onSelect: (networkId: string) => void;
  onRemove: (networkId: string) => void;
  onAddNetwork: () => void;
  onBack: () => void;
}

export const NetworksPage = ({ networks, onSelect, onRemove, onAddNetwork, onBack }: NetworksPageProps): ReactElement => (
  <Screen
    header={<TopBar title='Networks' onBack={onBack} />}
    footer={<Button label='Add custom network' tone='secondary' leadingIcon='plus' onPress={onAddNetwork} />}
  >
    <SectionLabel label='Choose a network for this wallet.' />
    {networks.map((network) => {
      const handlePress = (): void => (network.selected && network.isCustom ? onRemove(network.id) : onSelect(network.id));

      return (
        <ListRow
          key={network.id}
          label={network.name}
          description={network.detail}
          showChevron={false}
          leading={network.isTestnet ? <Badge label='Test' tone='warning' /> : undefined}
          trailing={network.selected ? <Icon name='check' size={20} /> : undefined}
          onPress={handlePress}
        />
      );
    })}
  </Screen>
);
