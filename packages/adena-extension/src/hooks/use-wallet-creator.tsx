import { WalletState } from "@states/index"
import { useRecoilState } from "recoil";
import { useCurrentAccount } from "./use-current-account";
import { WalletAccount } from "adena-module";
import { useAdenaContext } from "./use-context";

interface CreateWalletParams {
    mnemonic: string;
    password: string;
}

/**
 * 
 * @returns 
 */
export const useWalletCreator = (): [state: string, createWallet: (params: CreateWalletParams, background?: boolean) => Promise<string>] => {
    const { walletService, accountService } = useAdenaContext();

    const [state, setState] = useRecoilState(WalletState.state);
    const [, setWalletAccounts] = useRecoilState(WalletState.accounts);
    const [, , changeCurrentAccount] = useCurrentAccount();

    const createWallet = async (params: CreateWalletParams, background?: boolean) => {
        const {
            mnemonic,
            password
        } = params;
        let currentState: 'FINISH' | 'LOADING' | 'FAIL' = 'LOADING';
        if (!background) {
            setState(currentState);
        }
        try {
            const createdWallet = await walletService.createWallet({ mnemonic, password });
            await createdWallet.initAccounts();
            setWalletAccounts([...createdWallet.getAccounts()]);
            currentState = 'FINISH';
        } catch (e) {
            currentState = 'FAIL';
            console.log(e)
        }
        setState(currentState);
        return currentState;
    }


    return [state, createWallet];
}