import { GnoClientResnpose } from '@/api';
import { Test3Response } from '..';

export class StatusMapper {
  public static toNetworkInfo = (status: Test3Response.Status): GnoClientResnpose.NetworkInfo => {
    return {
      nodeInfo: {
        versionSet: status.node_info.version_set.map((versionSetItem) => {
          return {
            name: versionSetItem.Name,
            version: versionSetItem.Version,
            optional: versionSetItem.Optional,
          };
        }),
        netAddress: status.node_info.net_address,
        network: status.node_info.network,
        software: status.node_info.software,
        version: status.node_info.version,
        channels: status.node_info.channels,
        moniker: status.node_info.moniker,
        other: {
          txIndex: status.node_info.other.tx_index,
          rpcAddress: status.node_info.other.rpc_address,
        },
      },
      syncInfo: {
        latestBlockHash: status.sync_info.latest_block_hash,
        latestAppHash: status.sync_info.latest_app_hash,
        latestBlockHeight: status.sync_info.latest_block_height,
        latestBlockTime: status.sync_info.latest_block_time,
        catchingUp: status.sync_info.catching_up,
      },
      validatorInfo: {
        address: status.validator_info.address,
        votingPower: status.validator_info.voting_power,
        pubKey: {
          type: status.validator_info.pub_key['@type'],
          value: status.validator_info.pub_key.value,
        },
      },
    };
  };
}
