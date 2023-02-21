import { WalletState } from "@states/index";
import { TokenConfig } from "@states/wallet";
import axios from "axios";
import BigNumber from "bignumber.js";
import { useRecoilState } from "recoil";
import { useAdenaContext } from "./use-context";

export const useTokenConfig = (): [
    getConfig: () => Promise<Array<TokenConfig>>,
    convertTokenUnit: (amount: BigNumber, denom: string, convertType?: 'COMMON' | 'MINIMAL') => { amount: BigNumber, denom: string },
    getTokenImage: (denom: string) => string | undefined
] => {
    const { balanceService, resourceService } = useAdenaContext();
    const [tokenConfig, setTokenConfig] = useRecoilState(WalletState.tokenConfig);

    const getConfig = async () => {
        if (tokenConfig.length > 0) {
            return tokenConfig;
        }
        return fetchTokenConfig();
    }

    const convertUnit = (amount: BigNumber, denom: string, convertType?: 'COMMON' | 'MINIMAL'): { amount: BigNumber, denom: string } => {
        if (tokenConfig) {
            const currentTokenConfig = tokenConfig.find(
                config => denom.toUpperCase() === config.denom.toUpperCase() || denom.toUpperCase() === config.minimalDenom.toUpperCase());

            if (currentTokenConfig) {
                return balanceService.convertUnit(amount, denom, currentTokenConfig, convertType);
            }
        }
        return {
            amount,
            denom
        }
    }

    const fetchTokenConfig = async () => {
        const configs = await resourceService.fetchTokenConfigs();
        setTokenConfig(configs);
        updateTokenConfigImages(configs);
        return configs;
    }

    const updateTokenConfigImages = async (configs: Array<TokenConfig>) => {
        const changedConfigs = [];
        for (const config of configs) {
            let imageData = undefined;
            try {
                const response = await axios.get(config.image, { responseType: 'arraybuffer', });
                imageData = 'data:image/svg+xml;base64,' + Buffer.from(response.data, 'binary').toString('base64');
            } catch (e) {
                console.log(e);
            }
            changedConfigs.push({
                ...config,
                imageData
            })
        }
        setTokenConfig(changedConfigs);
    }

    const getTokenImage = (denom: string) => {
        const config = tokenConfig.find(
            config =>
                denom.toUpperCase() === config.denom.toUpperCase() ||
                denom.toUpperCase() === config.minimalDenom.toUpperCase()
        );
        return config?.imageData;
    }

    return [getConfig, convertUnit, getTokenImage]
}