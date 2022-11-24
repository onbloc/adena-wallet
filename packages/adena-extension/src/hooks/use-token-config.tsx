import { optimizeNumber } from "@common/utils/client-utils";
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
            const convertDenomType = convertType ?? 'COMMON';
            const currentTokenConfig = tokenConfig.find(
                config => denom.toUpperCase() === config.denom.toUpperCase() || denom.toUpperCase() === config.minimalDenom.toUpperCase());

            if (currentTokenConfig) {
                const denomType = currentTokenConfig.denom.toUpperCase() === denom.toUpperCase() ? 'COMMON' : 'MINIMAL';
                const currentUnit = denomType === 'COMMON' ? currentTokenConfig.unit : currentTokenConfig.minimalUnit;
                const convertUnit = convertDenomType === 'COMMON' ? currentTokenConfig.unit : currentTokenConfig.minimalUnit;

                const currentAmouont = optimizeNumber(amount, currentUnit / convertUnit);
                const currentDenom = convertDenomType === 'COMMON' ? currentTokenConfig.denom.toUpperCase() : currentTokenConfig.minimalDenom;

                return {
                    amount: currentAmouont,
                    denom: currentDenom
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
        const config = tokenConfig.find(
            config => denom.toUpperCase() === config.denom.toUpperCase() || denom.toUpperCase() === config.minimalDenom.toUpperCase());
        return config?.imageData;
    }

    return [getConfig, convertUnit, getTokenImage]
}