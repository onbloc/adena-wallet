import { WalletState } from "@states/index";
import { TokenConfig } from "@states/wallet";
import axios from "axios";
import { useRecoilState } from "recoil";

const TOKEN_CONFIG_URI = "https://raw.githubusercontent.com/onbloc/adena-resource/main/configs/tokens.json";

export const useTokenConfig = (): [
    getConfig: () => Promise<Array<TokenConfig>>,
    convertTokenUnit: (amount: number, denom: string, convertType?: 'COMMON' | 'MINIMAL') => { amount: number, denom: string },
    getTokenImage: (denom: string) => string | undefined
] => {
    const [tokenConfig, setTokenConfig] = useRecoilState(WalletState.tokenConfig);

    const getConfig = async () => {
        if (tokenConfig.length > 0) {
            return tokenConfig;
        }
        return await fetchTokenConfig();
    }

    const convertUnit = (amount: number, denom: string, convertType?: 'COMMON' | 'MINIMAL'): { amount: number, denom: string } => {
        if (tokenConfig) {
            const currentConverType = convertType ?? 'COMMON';
            const currentConfig = tokenConfig.find(
                config => denom.toUpperCase() === config.denom.toUpperCase() || denom.toUpperCase() === config.minimalDenom.toUpperCase());

            if (currentConfig) {
                if (currentConfig.denom.toUpperCase() === denom.toUpperCase()) {
                    if (currentConverType === 'MINIMAL') {
                        return {
                            amount: amount * (currentConfig.unit / currentConfig.minimalUnit),
                            denom: currentConfig.minimalDenom
                        }
                    }
                } else if (currentConfig.minimalDenom.toUpperCase() === denom.toUpperCase()) {
                    if (currentConverType === 'COMMON') {
                        return {
                            amount: amount * (currentConfig.minimalUnit / currentConfig.unit),
                            denom: currentConfig.denom.toUpperCase()
                        }
                    }
                }
            }
        }

        return {
            amount,
            denom
        }
    }

    const fetchTokenConfig = async () => {
        const response = await axios.get<{ [key in string]: TokenConfig }>(TOKEN_CONFIG_URI);
        const configs = Object.values(response.data);
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
        const currentConfig = tokenConfig.find(
            config => denom.toUpperCase() === config.denom.toUpperCase() || denom.toUpperCase() === config.minimalDenom.toUpperCase());
        return currentConfig?.imageData;
    }

    return [getConfig, convertUnit, getTokenImage]
}