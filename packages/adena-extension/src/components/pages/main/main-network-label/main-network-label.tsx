import React from 'react';
import { useTheme } from 'styled-components';
import { Text } from '@components/atoms';
import { MainNetworkLabelWrapper } from './main-network-label.styles';

export interface MainNetworkLabelProps {
  networkName: string;
  onClick?: () => void;
}

const MainNetworkLabel: React.FC<MainNetworkLabelProps> = ({ networkName, onClick }) => {
  const theme = useTheme();

  return (
    <MainNetworkLabelWrapper onClick={onClick} $clickable={!!onClick}>
      <Text
        style={{ display: 'flex', flexDirection: 'row' }}
        type='light13'
        color={theme.primary._2}
      >
        You are on <Text type='bold13'>{networkName}</Text>
      </Text>
    </MainNetworkLabelWrapper>
  );
};

export default MainNetworkLabel;
