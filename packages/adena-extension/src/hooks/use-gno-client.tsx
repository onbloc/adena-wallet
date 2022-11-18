import { LocalStorageValue } from "@common/values";
import { GnoClientService } from "@services/index";
import { GnoClientState } from "@states/index";
import { GnoClient } from "gno-client";
import { useEffect } from "react";
import { useRecoilState } from "recoil";

const getNetworkMapperType = (chainId: string) => {
    switch (chainId) {
        case 'test2':
            return 'TEST2';
        case 'test3':
            return 'TEST3';
        case 'main':
            return 'MAIN';
        default:
            return 'COMMON';
    }
}

const DEFAULT_CHAIN_ID = 'test3';

export const useGnoClient = (): [currentNetwork: InstanceType<typeof GnoClient> | null, networks: Array<InstanceType<typeof GnoClient>>, update: () => void, changeCurrentNetwork: (chainId: string) => void] => {

    const [currentNetwork, setCurrentNetwork] = useRecoilState(GnoClientState.current);
    const [networks, setNetworks] = useRecoilState(GnoClientState.networks);

    useEffect(() => {
        if (!currentNetwork) {
            updateNetworks();
        }
    }, [currentNetwork])

    useEffect(() => {
        initCurrentNetwork();
    }, [networks.length])

    const initCurrentNetwork = async () => {
        const chainId = await getCurrentChainId();
        if (chainId !== currentNetwork?.chainId) {
            changeCurrentNetwork(chainId);
        }
    }

    const getCurrentChainId = async () => {
        const storedChainId = await LocalStorageValue.get('CURRENT_CHAIN_ID');
        if (storedChainId !== '') {
            return storedChainId;
        }
        if (currentNetwork) {
            return currentNetwork.chainId;
        }
        return DEFAULT_CHAIN_ID;
    }

    const updateNetworks = async () => {
        const networkConfigs = await GnoClientService.loadNetworkConfigs();
        const currentChainId = await getCurrentChainId();
        await LocalStorageValue.set('CURRENT_CHAIN_ID', currentChainId);
        const createdNetworks = networkConfigs.map(config => GnoClient.createNetworkByType(config, getNetworkMapperType(config.chainId)));

        setNetworks(createdNetworks);
    }

    const changeCurrentNetwork = async (chainId: string) => {
        await LocalStorageValue.set('CURRENT_CHAIN_ID', chainId);
        const currentNetworkIndex = networks.findIndex(network => network.chainId === chainId);

        if (currentNetworkIndex > -1) {
            setCurrentNetwork(networks[currentNetworkIndex].clone());
        }
    }

    return [currentNetwork, networks, updateNetworks, changeCurrentNetwork];
}