import { GnoClientState } from "@states/index";
import { GnoClient } from "gno-client";
import { useCallback, useEffect } from "react";
import { useRecoilState } from "recoil";
import { useAdenaContext } from "./use-context";

const getNetworkMapperType = (chainId: string) => {
    switch (chainId) {
        case 'test2':
            return 'TEST2';
        case 'test3':
        default:
            return 'TEST3';
    }
}

const DEFAULT_CHAIN_ID = 'TEST3';

export const useGnoClient = (): [currentNetwork: GnoClient | null, networks: Array<GnoClient>, update: () => void, changeCurrentNetwork: (chainId: string) => void] => {
    const { chainService } = useAdenaContext();
    const [currentNetwork, setCurrentNetwork] = useRecoilState(GnoClientState.current);
    const [networks, setNetworks] = useRecoilState(GnoClientState.networks);

    useEffect(() => {
        // initCurrentNetwork();
    }, [networks.length])

    const initCurrentNetwork = async () => {
        const chainId = await getCurrentChainId();
        if (chainId.toUpperCase() !== currentNetwork?.chainId.toUpperCase()) {
            changeCurrentNetwork(chainId);
        }
    }

    const getCurrentChainId = async () => {
        if (!currentNetwork) {
            return DEFAULT_CHAIN_ID;
        }
        const network = await chainService.getCurrentNetwork();
        return network.chainId;
    }

    const updateNetworks = useCallback(async () => {
        const networkConfigs = await chainService.getNetworks();
        const currentChainId = await getCurrentChainId();
        chainService.updateCurrentNetworkId(currentChainId);
        const createdNetworks = networkConfigs.map(config =>
            GnoClient.createNetworkByType(
                { ...config, chainId: config.chainId, chainName: config.chainName },
                getNetworkMapperType(config.chainId)
            ));

        setNetworks(createdNetworks);
    }, [])

    const changeCurrentNetwork = async (chainId: string) => {
        let currentNetwork: GnoClient | null = null;
        const currentNetworkIndex = networks.findIndex(network =>
            network.chainId.toUpperCase() === chainId.toUpperCase());
        if (currentNetworkIndex > -1) {
            currentNetwork = networks[currentNetworkIndex].clone();
        } else {
            if (networks.length > 0) {
                currentNetwork = networks[currentNetworkIndex].clone();
            }
        }

        if (currentNetwork !== null) {
            setCurrentNetwork(currentNetwork.clone());
            await chainService.updateCurrentNetworkId(currentNetwork.chainId);
        }
        if (!currentNetwork) {
            updateNetworks();
        }
    }

    return [currentNetwork, networks, updateNetworks, changeCurrentNetwork];
}