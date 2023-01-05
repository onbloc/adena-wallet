import { ResourceService } from "@services/index";
import { GnoClientState } from "@states/index";
import { GnoClient } from "gno-client";
import { useEffect } from "react";
import { useRecoilState } from "recoil";
import { WalletRepository } from "@repositories/wallet";

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
        initCurrentNetwork();
    }, [networks.length])

    const initCurrentNetwork = async () => {
        const chainId = await getCurrentChainId();
        if (chainId !== currentNetwork?.chainId) {
            changeCurrentNetwork(chainId);
        }
    }

    const getCurrentChainId = async () => {
        const storedChainId = await WalletRepository.getCurrentChainId();
        if (storedChainId !== '') {
            return storedChainId;
        }
        if (currentNetwork) {
            return currentNetwork.chainId;
        }
        return DEFAULT_CHAIN_ID;
    }

    const updateNetworks = async () => {
        const networkConfigs = await ResourceService.fetchChainNetworks();
        const currentChainId = await getCurrentChainId();
        WalletRepository.updateCurrentChainId(currentChainId);
        const createdNetworks = networkConfigs.map(config => GnoClient.createNetworkByType({ ...config, chainId: config.networkId, chainName: config.networkName }, getNetworkMapperType(config.networkId)));

        setNetworks(createdNetworks);
    }

    const changeCurrentNetwork = async (chainId: string) => {
        let currentNetwork: InstanceType<typeof GnoClient> | null = null;
        const currentNetworkIndex = networks.findIndex(network => network.chainId === chainId);
        if (currentNetworkIndex > -1) {
            currentNetwork = networks[currentNetworkIndex].clone();
        } else {
            if (networks.length > 0) {
                currentNetwork = networks[currentNetworkIndex].clone();
            }
        }

        if (currentNetwork !== null) {
            setCurrentNetwork(currentNetwork.clone());
            await WalletRepository.updateCurrentChainId(currentNetwork.chainId);
        }
    }

    return [currentNetwork, networks, updateNetworks, changeCurrentNetwork];
}