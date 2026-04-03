import {
  INSUFFICIENT_COINS_ERROR_TYPE,
  INSUFFICIENT_FUNDS_ERROR_TYPE,
  INVALID_PUBLIC_KEY_ERROR_TYPE,
  UNKNOWN_ADDRESS_ERROR_TYPE,
} from '@common/constants/tx-error.constant'
import {
  parseTokenAmount,
} from '@common/utils/amount-utils'
import {
  GnoJSONRPCProvider,
} from '@gnolang/gno-js-client'
import {
  adaptAbciQueryResponse,
  Any,
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  parseABCI,
  TransactionEndpoint,
  Tx,
  uint8ArrayToBase64,
} from '@gnolang/tm2-js-client'
import {
  ResponseDeliverTx,
} from '@gnolang/tm2-js-client'
import {
  Tm2Client,
} from '@gnolang/tm2-rpc'

import {
  AccountInfo, GnoDocumentInfo, VMQueryType,
} from './types'
import {
  parseProto,
} from './utils'

export class GnoProvider extends GnoJSONRPCProvider {
  private chainId?: string

  constructor(baseURL: Tm2Client, chainId?: string) {
    super(baseURL)
    this.chainId = chainId
  }

  static async create(baseURL: string, chainId?: string): Promise<GnoProvider> {
    return new GnoProvider(await Tm2Client.connect(baseURL), chainId)
  }

  public async getAccountNumber(address: string, height?: number | undefined): Promise<number> {
    return this.getAccountInfo(address, height)
      .then(account => Number(account?.accountNumber ?? 0))
      .catch(() => 0)
  }

  public async getAccountSequence(address: string, height?: number | undefined): Promise<number> {
    return this.getAccountInfo(address, height)
      .then(account => Number(account?.sequence ?? 0))
      .catch(() => 0)
  }

  public async getGasPrice(height?: number | undefined): Promise<number> {
    try {
      const abciResponse = adaptAbciQueryResponse(await this.client.abciQuery({
        path: 'auth/gasprice',
        data: new Uint8Array(),
        height: height ?? 0,
        prove: false,
      }))

      const abciData = abciResponse.response.ResponseBase.Data
      if (!abciData) {
        return 0
      }

      const gasPrice = parseABCI<{
        gas: number
        price: string
      }>(abciData)

      const priceAmount = parseTokenAmount(gasPrice.price)
      if (gasPrice.gas === 0 || priceAmount === 0) {
        return 0
      }

      return priceAmount / gasPrice.gas
    }
    catch {
      return 0
    }
  }

  public async getAccountInfo(
    address: string,
    height?: number | undefined,
  ): Promise<AccountInfo | null> {
    const inActiveAccount: AccountInfo = {
      address,
      coins: '',
      chainId: '',
      status: 'IN_ACTIVE',
      publicKey: null,
      accountNumber: '0',
      sequence: '0',
    }

    const abciAccount = await this.getAccount(address, height).catch((e) => {
      console.info(e)
      return null
    })

    if (!abciAccount || !abciAccount.BaseAccount) {
      return inActiveAccount
    }

    try {
      const {
        coins,
        public_key: publicKey,
        account_number: accountNumber,
        sequence,
      } = abciAccount.BaseAccount

      return {
        address,
        coins,
        chainId: this.chainId ?? '',
        status: 'ACTIVE',
        publicKey,
        accountNumber,
        sequence,
      }
    }
    catch (e) {
      console.info(e)
      return inActiveAccount
    }
  }

  public getValueByEvaluateExpression(
    packagePath: string,
    functionName: string,
    params: (string | number)[],
  ): Promise<string | null> {
    const paramValues = params.map(param =>
      typeof param === 'number' ? `${param}` : `"${param}"`,
    )
    const expression = `${functionName}(${paramValues.join(',')})`

    return this.evaluateExpression(packagePath, expression)
      .then((result) => {
        const regex = /\((?:"((?:\\.|[^"\\])*)"|(\S+))\s+\w+\)/g
        const matches = result.matchAll(regex)

        for (const match of matches) {
          if (match?.[1] !== undefined) {
            const unescaped = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
            return unescaped
          }

          if (match?.[2] !== undefined) {
            return `${match[2]}`
          }
        }

        return null
      })
      .catch(() => null)
  }

  public async sendTransactionSync(tx: string): Promise<BroadcastTxSyncResult> {
    const response = this.sendTransaction(tx, TransactionEndpoint.BROADCAST_TX_SYNC)
    return response
  }

  public async sendTransactionCommit(tx: string): Promise<BroadcastTxCommitResult> {
    const response = this.sendTransaction(tx, TransactionEndpoint.BROADCAST_TX_COMMIT)
    return response
  }

  async simulateTx(tx: Tx): Promise<ResponseDeliverTx> {
    const encodedTx = uint8ArrayToBase64(Tx.encode(tx).finish())

    const abciResponse = adaptAbciQueryResponse(await this.client.abciQuery({
      path: '.app/simulate',
      data: new TextEncoder().encode(encodedTx),
      height: 0,
      prove: false,
    }))

    const responseValue = abciResponse.response.Value
    if (!responseValue) {
      throw new Error('Failed to estimate gas')
    }

    const simulateResult = parseProto(responseValue, ResponseDeliverTx.decode)

    if (simulateResult.response_base?.error) {
      if (
        simulateResult.response_base.error.type_url === INVALID_PUBLIC_KEY_ERROR_TYPE
        || simulateResult.response_base.error.type_url === UNKNOWN_ADDRESS_ERROR_TYPE
      ) {
        throw new Error(INVALID_PUBLIC_KEY_ERROR_TYPE)
      }

      if (
        simulateResult.response_base.error.type_url === INSUFFICIENT_FUNDS_ERROR_TYPE
        || simulateResult.response_base.error.type_url === INSUFFICIENT_COINS_ERROR_TYPE
      ) {
        throw new Error(simulateResult.response_base.error.type_url)
      }

      const errorResult = parseProto(simulateResult.response_base.error.value, Any.decode)
      if (errorResult.type_url !== '') {
        throw new Error(errorResult.type_url)
      }

      const typeUrl = simulateResult.response_base.error.type_url
      const errorLogs = simulateResult.response_base.log.split('\n')

      const errorLogFirstLine = errorLogs.length > 0 ? errorLogs[0] : ''
      if (errorLogFirstLine !== '') {
        throw new Error(`${typeUrl}: ${errorLogFirstLine}`)
      }

      throw new Error(typeUrl)
    }

    return simulateResult
  }

  public async getRealmDocument(packagePath: string): Promise<GnoDocumentInfo | null> {
    try {
      const abciResponse = adaptAbciQueryResponse(await this.client.abciQuery({
        path: VMQueryType.QUERY_DOCUMENT,
        data: new TextEncoder().encode(packagePath),
        height: 0,
        prove: false,
      }))

      const abciData = abciResponse.response.ResponseBase.Data
      if (!abciData) {
        return null
      }

      return parseABCI<GnoDocumentInfo>(abciData)
    }
    catch (e) {
      console.info(e)
    }

    return null
  }
}
