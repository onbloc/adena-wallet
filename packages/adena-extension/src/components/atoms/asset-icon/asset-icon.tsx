import React from 'react';
import styled from 'styled-components';
import { getTheme } from '@styles/theme';

interface AssetIconProps {
  tokenIconUrl: string;
  chainIconUrl?: string;
  size?: number;
  onLoad?: () => void;
  onError?: () => void;
}

interface ContainerProps {
  size: number;
}

const Container = styled.div<ContainerProps>`
  position: relative;
  flex-shrink: 0;
  width: ${({ size }): string => `${size}px`};
  height: ${({ size }): string => `${size}px`};
`;

const TokenIcon = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 50%;
`;

const ChainBadge = styled.img`
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 40%;
  height: 40%;
  border-radius: 50%;
  border: 1.5px solid ${getTheme('neutral', '_9')};
`;

const AssetIcon: React.FC<AssetIconProps> = ({
  tokenIconUrl,
  chainIconUrl,
  size = 34,
  onLoad,
  onError,
}) => (
  <Container size={size}>
    <TokenIcon src={tokenIconUrl} onLoad={onLoad} onError={onError} alt='token icon' />
    {chainIconUrl && <ChainBadge src={chainIconUrl} alt='chain icon' />}
  </Container>
);

export default AssetIcon;
