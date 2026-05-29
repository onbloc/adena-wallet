import {
  resolveSessionAdminGasFee,
  resolveSessionAdminGasInfo,
  SESSION_ADMIN_GAS_ESTIMATE_LIMIT,
  SESSION_ADMIN_GAS_WANTED_FALLBACK,
} from './session-admin-gas';

describe('session-admin-gas', () => {
  const account = {
    publicKey: Uint8Array.from([2, ...Array(32).fill(1)]),
  } as any;
  const message = { type: '/auth.m_revoke_session', value: { creator: 'g1master' } };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses chain gas price when calculating fee', async () => {
    const fee = await resolveSessionAdminGasFee(
      { getGasPrice: jest.fn().mockResolvedValue(0.002) },
      1_500_000,
    );

    expect(fee).toBe(3_000);
  });

  it('uses minimum gas price when gas price lookup fails', async () => {
    const fee = await resolveSessionAdminGasFee(
      { getGasPrice: jest.fn().mockRejectedValue(new Error('rpc failed')) },
      2_000_000,
    );

    expect(fee).toBe(2_000);
  });

  it('estimates gas with a high simulation limit and applies safety margin', async () => {
    const createDocument = jest.fn().mockResolvedValue({
      msgs: [message],
      fee: {
        gas: SESSION_ADMIN_GAS_ESTIMATE_LIMIT.toString(),
        amount: [{ denom: 'ugnot', amount: '10000' }],
      },
      memo: '',
      chain_id: 'test-13',
      account_number: '1',
      sequence: '1',
    });
    const estimateGas = jest.fn().mockResolvedValue(1_166_340);

    const gasInfo = await resolveSessionAdminGasInfo({
      gnoProvider: { getGasPrice: jest.fn().mockResolvedValue(0.001) },
      transactionService: { createDocument },
      transactionGasService: { estimateGas },
      masterAccount: account,
      chainId: 'test-13',
      message,
    });

    expect(createDocument).toHaveBeenCalledWith(
      account,
      'test-13',
      [message],
      'g',
      SESSION_ADMIN_GAS_ESTIMATE_LIMIT,
      10_000,
      '',
    );
    expect(gasInfo).toEqual({
      gasWanted: 1_399_608,
      gasFeeUgnot: 1_400,
      gasUsed: 1_166_340,
      estimated: true,
    });
  });

  it('falls back when estimate fails', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const gasInfo = await resolveSessionAdminGasInfo({
      gnoProvider: null,
      transactionService: {
        createDocument: jest.fn().mockRejectedValue(new Error('simulate failed')),
      },
      transactionGasService: { estimateGas: jest.fn() },
      masterAccount: account,
      chainId: 'test-13',
      message,
    });

    expect(gasInfo).toEqual({
      gasWanted: SESSION_ADMIN_GAS_WANTED_FALLBACK,
      gasFeeUgnot: 2_000,
      gasUsed: null,
      estimated: false,
    });
    expect(console.warn).toHaveBeenCalledWith(
      '[session-admin-gas] estimate failed. using fallback gas.',
      expect.any(Error),
    );
  });
});
