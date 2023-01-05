import { WalletState } from "@states/index"
import { useRecoilState } from "recoil";
import { WalletService } from "@services/index";
import { useCurrentAccount } from "./use-current-account";
import { WalletAccount } from "adena-module";

interface CreateWalletParams {
    mnemonic: string;
    password: string;
}

/**
 * 
 * @returns 
 */
export const useWalletCreator = (): [state: string, createWallet: (params: CreateWalletParams, background?: boolean) => Promise<string>] => {

    const [state, setState] = useRecoilState(WalletState.state);
    const [, setWallet] = useRecoilState(WalletState.wallet);
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
            const createdWallet = await WalletService.createWallet({ mnemonic, password });
            await createdWallet.initAccounts();
            await initCurrentAccount(createdWallet.getAccounts());
            setWallet(createdWallet);
            setWalletAccounts([...createdWallet.getAccounts()]);
            currentState = 'FINISH';
        } catch (e) {
            currentState = 'FAIL';
            console.log(e)
        }
        setState(currentState);
        return currentState;
    }

    const initCurrentAccount = async (walletAccounts: Array<InstanceType<typeof WalletAccount>>) => {
        const currentAccountAddress = await WalletService.loadCurrentAccountAddress();
        const currentAccount = walletAccounts.find(account => account.getAddress() === currentAccountAddress);
        if (currentAccount) {
            await changeCurrentAccount(currentAccount.getAddress(), walletAccounts);
            await WalletService.saveCurrentAccountAddress(currentAccount.getAddress());
        } else {
            if (walletAccounts.length > 0) {
                await changeCurrentAccount(walletAccounts[0].getAddress(), walletAccounts);
                await WalletService.saveCurrentAccountAddress(walletAccounts[0].getAddress());
            }
        }
    }

    return [state, createWallet];
}