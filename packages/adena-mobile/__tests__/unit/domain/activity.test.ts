import { ActivityDirection, ActivityFilterKind, ActivityStatus, ActivityType } from '../../../src/domain/activity';

describe('activity enums', () => {
  it('exposes stable values', () => {
    expect(Object.values(ActivityType)).toEqual(['TRANSFER', 'TRANSFER_GRC721', 'ADD_PACKAGE', 'CONTRACT_CALL', 'MULTI_CONTRACT_CALL']);
    expect(Object.values(ActivityStatus)).toEqual(['SUCCESS', 'FAIL']);
    expect(Object.values(ActivityDirection)).toEqual(['in', 'out', 'none']);
    expect(Object.values(ActivityFilterKind)).toEqual(['all', 'native', 'grc20']);
  });
});
