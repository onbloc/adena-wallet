import type { TxSignPayload } from '@gnolang/tm2-js-client';

import { AdenaResponse } from './common';

// TODO: replace with `WalletResponseExecuteType` import from
// `@adena-wallet/sdk` once the SDK ships a SIGN_ARBITRARY entry. Until then
// `WalletMessageInfo` has no row for this key and `InjectionMessageInstance`
// would throw on destructure. Mirrors the Cosmos stand-in in `./cosmos`.
export const SignArbitraryExecuteType = {
  SIGN_ARBITRARY: 'SIGN_ARBITRARY',
} as const;
export type SignArbitraryExecuteType =
  (typeof SignArbitraryExecuteType)[keyof typeof SignArbitraryExecuteType];

// `createPopup` carries the request to the approval window inside the popup URL
// (JSON -> encodeURI -> base64), so a payload arrives at roughly four times its
// own size. Capping makes an oversized message a rejection, not a truncation.
export const MAX_ARBITRARY_MESSAGE_BYTES = 4096;

export interface SignArbitraryParams {
  signer: string;
  // Text, not bytes: `Uint8Array` does not survive the JSON boundary to the
  // background worker, and the approval window has to display this.
  data: string;
}

export interface SignArbitrarySignature {
  pubKey: {
    typeUrl: string;
    // The compressed key itself, base64, not protobuf-wrapped: a verifier uses
    // it directly, and for an account that never transacted this is the only
    // place the key is available.
    value: string;
  };
  signature: string;
}

export interface SignArbitraryData {
  // Echoed back so a verifier rebuilds the signed bytes from the exact payload.
  signed: TxSignPayload;
  signature: SignArbitrarySignature;
}

export type SignArbitraryResponse = AdenaResponse<SignArbitraryData>;

export type AdenaSignArbitrary = (params: SignArbitraryParams) => Promise<SignArbitraryResponse>;
