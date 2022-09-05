import axios, { AxiosInstance } from 'axios';
import { OfflineAminoSigner, StdSignDoc } from '@cosmjs/amino';
import { testnet } from './config';
import { createPostMsg, createSignDoc, createTransferMsg, makeProtoTx } from './tx_utils';
import { BaseAccount, TxResponse, Coin } from './types';

export class GnoClient {
  constructor(private instance: AxiosInstance) {}

  async render(realm: string, query?: string): Promise<string> {
    const res = await this.instance.get(`/gno/render?realm=${realm}&query=${query ?? ''}`);

    return res.data;
  }

  async getAccount(address: string): Promise<BaseAccount | undefined | string> {
    try {
      const res = await this.instance.get(`/abci_query?path=%22auth/accounts/${address}%22`);
      if (res.data.error) {
        throw res.data.error.message;
      } else {
        if (res.data.result.response.ResponseBase.Data === 'bnVsbA==') {
          return 'WAY TOO FRESH ACCOUNT';
          // throw new Error('WAY TOO FRESH ACCOUNT');
        }
        const responseBase = JSON.parse(atob(res.data.result.response.ResponseBase.Data));
        return responseBase.BaseAccount;
      }
    } catch (e) {
      console.log(e);
    }
    return;
  }

  async getBalance(address: string): Promise<Coin[] | undefined> {
    try {
      const res = await this.instance.get(`/abci_query?path=%22bank/balances/${address}%22`);
      if (res.data.error) {
        throw res.data.error.message;
      } else {
        const rtn: Coin[] = [];
        let responseBase: any = atob(res.data.result.response.ResponseBase.Data);
        responseBase = responseBase
          .trim()
          .replaceAll('"', '')
          .match(/[a-zA-Z]+|[0-9]+(?:\.[0-9]+|)/g);
        if (!responseBase) {
          responseBase = ['0.000000', 'gnot'];
        }
        const gno_types = await axios.get('https://conf.adena.app/token.json');
        gno_types.data.forEach((element: any) => {
          if (responseBase[1] === element.denom) {
            if (element.unit) {
              element.amount = parseFloat(
                (parseFloat(responseBase[0]) * element.unit).toFixed(6),
              ).toLocaleString('es-US', { minimumFractionDigits: 6 });
            } else {
              element.amount = responseBase[0];
            }
            rtn.push(element);
          }
        });
        //TODO
        // Multi chain

        return rtn;
      }
    } catch (e) {
      console.log(e);
    }
    return;
  }

  async doContract(
    type: string,
    args: any,
    address: string,
    signer: OfflineAminoSigner | undefined | any,
  ) {
    try {
      const gasWanted = 60000;
      const account_info: any = await this.getAccount(address);
      let msg: any;

      switch (type) {
        case 'bank':
          msg = createTransferMsg(address, args.to_address, args.sendamount);
          break;
        case 'createPost':
          msg = createPostMsg(address, parseInt(args.bid), args.title, args.body);
          break;
        default:
          break;
      }
      const signDoc = createSignDoc(account_info, msg, testnet, gasWanted);
      const signature = signer.signAmino(address, signDoc);
      const txBz = makeProtoTx((await signature).signed, (await signature).signature);
      await this.broadcastTx(txBz);
    } catch (e) {
      console.log(e);
    }
  }

  async doContractMsg(doc: any, address: string, signer: OfflineAminoSigner | undefined | any) {
    try {
      const account_info: any = await this.getAccount(address);
      doc.account_number = account_info.account_number;
      doc.sequence = account_info.sequence;

      const signature = signer.signAmino(address, doc);
      const txBz = makeProtoTx((await signature).signed, (await signature).signature);
      return await this.broadcastTx(txBz);
    } catch (e) {
      console.log(e);
    }
  }

  async broadcastTx(tx: Uint8Array): Promise<TxResponse> {
    const payload = {
      tx_bytes: Buffer.from(tx).toString('base64'),
      mode: 'BROADCAST_MODE_BLOCK',
    };
    const aa = Buffer.from(tx).toString('base64');

    const d_str = atob(aa);

    const byte_str = Uint8Array.from(d_str, (c) => c.charCodeAt(0));
    const res = await this.instance.get(`/broadcast_tx_commit?tx=[${tx}]`);
    const txResponse = res.data.result.check_tx.ResponseBase;
    if (txResponse.Error) {
      let log = txResponse.Data;
      if (log) {
        log = log.split('\n')[0];
      }
      throw new Error(log);
    }

    return txResponse;
  }
}
