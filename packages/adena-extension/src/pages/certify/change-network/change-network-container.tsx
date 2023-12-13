import ChangeNetwork from '@components/change-network/change-network/change-network';
import { useNetwork } from '@hooks/use-network';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { RoutePath } from '@router/path';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const ChangeNetworkContainer: React.FC = () => {
  const navigate = useNavigate();
  const { modified, currentNetwork, networks, setModified, changeNetwork } = useNetwork();
  const { initTokenMetainfos } = useTokenMetainfo();

  useEffect(() => {
    if (modified) {
      setTimeout(() => setModified(false), 1000);
    }
  }, [modified]);

  const displayNetworks = useMemo(() => {
    return networks.filter((network) => network.deleted !== true);
  }, [networks]);

  const loading = useMemo(() => {
    return networks.length === 0 || modified;
  }, [networks, modified]);

  const moveAddPage = useCallback(() => {
    navigate(RoutePath.AddCustomNetwork);
  }, [navigate]);

  const moveEditPage = useCallback(
    (networkId: string) => {
      navigate(RoutePath.EditCustomNetwork + '?networkId=' + networkId, {
        state: { networkId },
      });
    },
    [navigate],
  );

  const moveBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const changeNetworkAndRoutePage = async (networkId: string): Promise<void> => {
    if (networkId === currentNetwork?.id) {
      return;
    }
    await changeNetwork(networkId);
    await initTokenMetainfos();
    navigate(RoutePath.Wallet);
  };

  return (
    <ChangeNetwork
      loading={loading}
      currentNetworkId={currentNetwork.id}
      networkMetainfos={displayNetworks}
      changeNetwork={changeNetworkAndRoutePage}
      moveAddPage={moveAddPage}
      moveEditPage={moveEditPage}
      moveBack={moveBack}
    />
  );
};

export default ChangeNetworkContainer;
