import React, { useCallback, useEffect, useMemo } from 'react';

import { CommonFullContentLayout } from '@components/atoms';
import ChangeNetwork from '@components/pages/change-network/change-network/change-network';
import useAppNavigate from '@hooks/use-app-navigate';
import { useNetwork } from '@hooks/use-network';
import { RoutePath } from '@types';

const ChangeNetworkContainer: React.FC = () => {
  const { navigate, goBack } = useAppNavigate();
  const { modified, currentNetwork, networks, setModified, changeNetwork } = useNetwork();

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
      navigate(RoutePath.EditCustomNetwork, {
        state: { networkId },
      });
    },
    [navigate],
  );

  const changeNetworkAndRoutePage = async (networkId: string): Promise<void> => {
    if (networkId === currentNetwork?.id) {
      return;
    }

    if (networkId) {
      await changeNetwork(networkId);
      navigate(RoutePath.Wallet);
    }
  };

  return (
    <CommonFullContentLayout>
      <ChangeNetwork
        loading={loading}
        currentNetworkId={currentNetwork.id}
        networkMetainfos={displayNetworks}
        changeNetwork={changeNetworkAndRoutePage}
        moveAddPage={moveAddPage}
        moveEditPage={moveEditPage}
        moveBack={goBack}
      />
    </CommonFullContentLayout>
  );
};

export default ChangeNetworkContainer;
