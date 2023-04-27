import { GnoClient } from "gno-client";
import { useCallback } from "react";
import { useNetwork } from "./use-network";

export const useGnoClient = (): [currentNetwork: GnoClient | null, networks: Array<GnoClient>] => {
    const { currentNetwork, networks } = useNetwork();

    const getCurrentChainId = useCallback(() => {
        return GnoClient.createNetwork({
            ...currentNetwork,
            chainId: currentNetwork.networkId,
            chainName: currentNetwork.networkName
        });
    }, [currentNetwork]);

    const getGnoClients = useCallback(() => {
        return networks.map((network) => GnoClient.createNetwork({
            ...network,
            chainId: network.networkId,
            chainName: network.networkName
        }))
    }, [networks]);

    return [getCurrentChainId(), getGnoClients()];
}