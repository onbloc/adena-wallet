import React, { useCallback, useMemo } from 'react';

import atomoneChainIcon from '@assets/icons/chains/atomone.svg';
import gnolandChainIcon from '@assets/icons/chains/gno-chain.svg';
import { CommonFullContentLayout } from '@components/atoms';
import ChangeNetwork, {
  ChainGroupSectionModel,
} from '@components/pages/change-network/change-network/change-network';
import useAppNavigate from '@hooks/use-app-navigate';
import type { ChainGroup } from '@hooks/use-network';
import { useNetwork } from '@hooks/use-network';
import { NetworkState } from '@states';
import { RoutePath } from '@types';

type NetworkMode = NetworkState.NetworkMode;

const CHAIN_GROUP_ICON_MAP: Record<ChainGroup, string> = {
  gno: gnolandChainIcon,
  atomone: atomoneChainIcon,
};

const ChangeNetworkContainer: React.FC = () => {
  const { navigate, goBack } = useAppNavigate();
  const {
    currentNetwork,
    currentAtomoneNetwork,
    networks,
    atomoneNetworks,
    networkMode,
    changeNetwork,
    changeNetworkMode,
  } = useNetwork();

  const loading = useMemo(() => {
    return networks.length === 0;
  }, [networks]);

  const isTestnet = networkMode === 'testnet';

  const gnoNetworks = useMemo(() => {
    return networks
      .filter((network) => network.deleted !== true)
      .filter((network) => (network.main === true) !== isTestnet);
  }, [networks, isTestnet]);

  const atomoneVisibleNetworks = useMemo(() => {
    return atomoneNetworks
      .filter((network) => network.deleted !== true)
      .filter((network) => network.isMainnet !== isTestnet);
  }, [atomoneNetworks, isTestnet]);

  const sections = useMemo<ChainGroupSectionModel[]>(() => {
    return [
      {
        chainGroup: 'gno',
        displayName: 'Gno.land',
        networks: gnoNetworks,
        selectedNetworkId: currentNetwork?.id ?? null,
        iconUrl: CHAIN_GROUP_ICON_MAP.gno,
        canAdd: isTestnet,
      },
      {
        chainGroup: 'atomone',
        displayName: 'AtomOne',
        networks: atomoneVisibleNetworks,
        selectedNetworkId: currentAtomoneNetwork?.id ?? null,
        iconUrl: CHAIN_GROUP_ICON_MAP.atomone,
        canAdd: isTestnet,
      },
    ];
  }, [gnoNetworks, atomoneVisibleNetworks, currentNetwork, currentAtomoneNetwork, isTestnet]);

  const onAdd = useCallback(
    (chainGroup: ChainGroup) => {
      navigate(RoutePath.AddCustomNetwork, {
        state: { chainGroup },
      });
    },
    [navigate],
  );

  const onEdit = useCallback(
    (chainGroup: ChainGroup, networkId: string) => {
      navigate(RoutePath.EditCustomNetwork, {
        state: { networkId, chainGroup },
      });
    },
    [navigate],
  );

  const onSelect = useCallback(
    async (_chainGroup: ChainGroup, networkId: string) => {
      await changeNetwork(networkId);
    },
    [changeNetwork],
  );

  const onChangeMode = useCallback(
    (mode: NetworkMode) => {
      changeNetworkMode(mode);
    },
    [changeNetworkMode],
  );

  return (
    <CommonFullContentLayout>
      <ChangeNetwork
        loading={loading}
        networkMode={networkMode}
        sections={sections}
        onChangeMode={onChangeMode}
        onSelect={onSelect}
        onEdit={onEdit}
        onAdd={onAdd}
        moveBack={goBack}
      />
    </CommonFullContentLayout>
  );
};

export default ChangeNetworkContainer;
