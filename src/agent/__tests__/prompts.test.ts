import { buildWalletPrompt } from '../prompts';

const carol = { alias: 'carol', address: 'g1tvdw0s3jn54khce6mua7lqpzry9x8gf2tvdw0s' };
const dave = { alias: 'dave', address: 'g1l7aum6echk45nj3s0wdvt2fg8x9yrzpql7aum6' };

describe('buildWalletPrompt', () => {
  it('names the contacts but never writes their addresses, so the model cannot copy one wrongly', () => {
    const prompt = buildWalletPrompt({ contacts: [carol, dave], approvals: false });

    expect(prompt).toContain('Contacts: carol, dave');
    expect(prompt).not.toContain(carol.address);
    expect(prompt).not.toContain(dave.address);
  });

  it('has no contacts line when the wallet has no address book', () => {
    expect(buildWalletPrompt({ contacts: [], approvals: false })).not.toContain('Contacts:');
  });

  it('mentions get_approvals only when the wallet can list approvals', () => {
    expect(buildWalletPrompt({ contacts: [], approvals: true })).toContain('get_approvals');
    expect(buildWalletPrompt({ contacts: [], approvals: false })).not.toContain('get_approvals');
  });

});
