import { Wallet, WalletAccount } from "../index";

const mnemonic = "source bonus chronic canvas draft south burst lottery vacant surface solve popular case indicate oppose farm nothing bullet exhibit title speed wink action roast";

describe("create account by wallet", () => {
  it("success", async () => {
    const wallet = await Wallet.createByMnemonic(mnemonic);
    await wallet.initAccounts();
    const accounts = wallet.getAccounts();

    const expectedPrivateKeyHex = "ea97b9fddb7e6bf6867090a7a819657047949fbb9466d617f940538efd888605";
    expect(accounts[0]).toBeTruthy();
    expect(accounts[0].getAddress()).toBe("g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5");
    expect(accounts[0].getPrivateKey()).toBe(expectedPrivateKeyHex);
  });
});

describe("create account by private key", () => {
  it("create by private key", async () => {
    const privateKeyHex = "ea97b9fddb7e6bf6867090a7a819657047949fbb9466d617f940538efd888605";

    const account = await WalletAccount.createByPrivateKeyHex(privateKeyHex, 'g');

    expect(account.getAddress()).toBe("g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5");
  });
});

export { };