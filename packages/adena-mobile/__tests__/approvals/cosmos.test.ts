import {
  cosmosResponse,
  normalizeChainIds,
  signDocChainId,
} from '../../src/approvals/CosmosApprovals';

describe('Cosmos approval helpers', () => {
  it('builds the response shape the extension sends', () => {
    expect(cosmosResponse('ENABLE_COSMOS', 'success', 'k1')).toEqual({
      code: 0,
      key: 'k1',
      type: 'ENABLE_COSMOS',
      status: 'success',
      message: '',
      data: undefined,
    });
    expect(
      cosmosResponse('SIGN_COSMOS_AMINO', 'failure', 'k2', {error: 'x'}, 'E'),
    ).toMatchObject({code: 1, status: 'failure', message: 'E'});
  });

  it('accepts one chain id or a list, and drops empty values', () => {
    expect(normalizeChainIds('atomone-1')).toEqual(['atomone-1']);
    expect(
      normalizeChainIds(['atomone-1', '', 3, 'atomone-testnet-1']),
    ).toEqual(['atomone-1', 'atomone-testnet-1']);
    expect(normalizeChainIds('')).toEqual([]);
    expect(normalizeChainIds(undefined)).toEqual([]);
  });

  it('reads the chain from the document in each sign mode', () => {
    expect(signDocChainId('amino', {chain_id: 'atomone-1'})).toBe('atomone-1');
    expect(signDocChainId('direct', {chainId: 'atomone-1'})).toBe('atomone-1');
    // A field from the other mode does not count.
    expect(signDocChainId('amino', {chainId: 'atomone-1'})).toBeUndefined();
    expect(signDocChainId('direct', null)).toBeUndefined();
  });
});
