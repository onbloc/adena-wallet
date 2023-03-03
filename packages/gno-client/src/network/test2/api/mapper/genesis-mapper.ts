import { GnoClientResnpose } from '../../../../api';
import { Test2Response } from '..';

export class GenesisMapper {
  public static toGenesis = (genesis: Test2Response.Genesis): GnoClientResnpose.Genesis => {
    const genesisValue = genesis.genesis;
    return {
      genesisTime: genesisValue.genesis_time,
      chainId: genesisValue.chain_id,
      consensusParams: {
        block: {
          maxTxBytes: genesisValue.consensus_params.Block.MaxBlockBytes,
          maxDataBytes: genesisValue.consensus_params.Block.MaxDataBytes,
          maxBlockBytes: genesisValue.consensus_params.Block.MaxBlockBytes,
          maxGas: genesisValue.consensus_params.Block.MaxGas,
          timeIotaMs: genesisValue.consensus_params.Block.TimeIotaMS,
        },
        validator: {
          pubKeyTypeUrLs: genesisValue.consensus_params.Validator.PubKeyTypeURLs,
        },
      },
      validators: genesisValue.validators.map((validatorItem) => {
        return {
          address: validatorItem.address,
          pubKey: {
            type: validatorItem.pub_key['@type'],
            value: validatorItem.pub_key.value,
          },
          power: validatorItem.power,
          name: validatorItem.name,
        };
      }),
      appHash: genesisValue.app_hash,
      appState: {
        type: genesisValue.app_state['@type'],
        balances: genesisValue.app_state.balances,
        txs: genesisValue.app_state.txs.map((txsItem) => {
          return {
            msg: txsItem.msg.map((msgItem) => {
              return {
                type: msgItem['@type'],
                creator: msgItem.creator,
                package: {
                  name: msgItem.package.Name,
                  path: msgItem.package.Path,
                  files: msgItem.package.Files.map((fileItem) => {
                    return {
                      name: fileItem.Name,
                      body: fileItem.Body,
                    };
                  }),
                },
                deposit: msgItem.deposit,
              };
            }),
            fee: {
              gasWanted: txsItem.fee.gas_wanted,
              gasFee: txsItem.fee.gas_fee,
            },
            signatures: txsItem.signatures.map((signatureItem) => {
              return {
                pubKey: signatureItem.pub_key,
                signature: signatureItem.signature,
              };
            }),
            memo: txsItem.memo,
          };
        }),
      },
    };
  };
}
