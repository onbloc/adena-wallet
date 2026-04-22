export const MSG_MINT_PHOTON_TYPE_URL = '/atomone.photon.v1.MsgMintPhoton';

/**
 * AtomOne allows ATONE (uatone) as a fee only when the tx includes a
 * `MsgMintPhoton` message (`x/photon`'s `tx_fee_exceptions` param). Every
 * other tx must pay in PHOTON (uphoton). This helper detects a MintPhoton
 * message regardless of whether it was produced by the AMINO or DIRECT
 * signing pipeline.
 *
 * - AMINO form:  { type: "cosmos-sdk/MsgMintPhoton" | "/atomone.photon.v1.MsgMintPhoton", value: ... }
 * - DIRECT form: { typeUrl: "/atomone.photon.v1.MsgMintPhoton", value: Uint8Array }
 */
export function isMsgMintPhoton(msg: unknown): boolean {
  if (!msg || typeof msg !== 'object') {
    return false;
  }
  const record = msg as Record<string, unknown>;
  const amino = record.type;
  if (typeof amino === 'string' && amino.includes('MsgMintPhoton')) {
    return true;
  }
  const direct = record.typeUrl;
  if (typeof direct === 'string' && direct.includes('MsgMintPhoton')) {
    return true;
  }
  return false;
}

export function hasMsgMintPhoton(msgs: unknown[]): boolean {
  return msgs.some(isMsgMintPhoton);
}
