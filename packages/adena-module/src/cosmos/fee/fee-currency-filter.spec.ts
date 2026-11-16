import {
  MSG_MINT_PHOTON_TYPE_URL,
  hasMsgMintPhoton,
  isMsgMintPhoton,
} from './fee-currency-filter';

describe('fee-currency-filter', () => {
  describe('isMsgMintPhoton', () => {
    it('detects the DIRECT proto msg form', () => {
      expect(
        isMsgMintPhoton({ typeUrl: MSG_MINT_PHOTON_TYPE_URL, value: new Uint8Array() }),
      ).toBe(true);
    });

    it('detects the AMINO msg form', () => {
      expect(
        isMsgMintPhoton({ type: 'cosmos-sdk/MsgMintPhoton', value: {} }),
      ).toBe(true);
      expect(
        isMsgMintPhoton({ type: MSG_MINT_PHOTON_TYPE_URL, value: {} }),
      ).toBe(true);
    });

    it('returns false for MsgSend', () => {
      expect(
        isMsgMintPhoton({ type: 'cosmos-sdk/MsgSend', value: {} }),
      ).toBe(false);
      expect(
        isMsgMintPhoton({ typeUrl: '/cosmos.bank.v1beta1.MsgSend' }),
      ).toBe(false);
    });

    it('returns false for unknown or malformed input', () => {
      expect(isMsgMintPhoton(null)).toBe(false);
      expect(isMsgMintPhoton(undefined)).toBe(false);
      expect(isMsgMintPhoton('not an object')).toBe(false);
      expect(isMsgMintPhoton({})).toBe(false);
    });
  });

  describe('hasMsgMintPhoton', () => {
    it('returns true when any message is MintPhoton', () => {
      expect(
        hasMsgMintPhoton([
          { type: 'cosmos-sdk/MsgSend', value: {} },
          { typeUrl: MSG_MINT_PHOTON_TYPE_URL },
        ]),
      ).toBe(true);
    });

    it('returns false when no message is MintPhoton', () => {
      expect(
        hasMsgMintPhoton([
          { type: 'cosmos-sdk/MsgSend', value: {} },
          { typeUrl: '/cosmos.bank.v1beta1.MsgSend' },
        ]),
      ).toBe(false);
    });

    it('returns false for empty input', () => {
      expect(hasMsgMintPhoton([])).toBe(false);
    });
  });
});
