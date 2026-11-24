import { buildWalletPrompt } from '../prompts';

const carol = { alias: 'carol', address: 'g1tvdw0s3jn54khce6mua7lqpzry9x8gf2tvdw0s' };
const dave = { alias: 'dave', address: 'g1l7aum6echk45nj3s0wdvt2fg8x9yrzpql7aum6' };

describe('buildWalletPrompt', () => {
  it('names the contacts but never writes their addresses, so the model cannot copy one wrongly', () => {
    const prompt = buildWalletPrompt({ contacts: [carol, dave], approvals: false, allowTransactionPreparation: false });

    expect(prompt).toContain('Contacts: carol, dave');
    expect(prompt).not.toContain(carol.address);
    expect(prompt).not.toContain(dave.address);
  });

  it('has no contacts line when the wallet has no address book', () => {
    expect(buildWalletPrompt({ contacts: [], approvals: false, allowTransactionPreparation: false })).not.toContain('Contacts:');
  });

  it('mentions get_approvals only when the wallet can list approvals', () => {
    expect(buildWalletPrompt({ contacts: [], approvals: true, allowTransactionPreparation: false })).toContain('get_approvals');
    expect(buildWalletPrompt({ contacts: [], approvals: false, allowTransactionPreparation: true })).not.toContain('get_approvals');
  });

  it('only offers transaction preparation when the host has explicitly enabled it', () => {
    const readOnly = buildWalletPrompt({ contacts: [], approvals: true, allowTransactionPreparation: false });
    expect(readOnly).toContain('Transaction preparation is not enabled for this run.');
    expect(readOnly).not.toContain('call transfer directly');
    expect(readOnly).not.toContain('call approve');
    expect(readOnly).toContain('get_approvals');

    const enabled = buildWalletPrompt({ contacts: [], approvals: false, allowTransactionPreparation: true });
    expect(enabled).toContain('call transfer directly');
    expect(enabled).toContain('call approve');
    expect(enabled).toContain('nothing is sent');
    expect(enabled).toContain('For a transfer or approval, if the user gave neither a recipient/spender address nor a contact name');
  });

  it('requests normalized current balances and supports tool-free terminology explanations', () => {
    const prompt = buildWalletPrompt({ contacts: [], approvals: false, allowTransactionPreparation: false });
    expect(prompt).toContain('use get_balance when available');
    expect(prompt).toContain('partial, unavailable, or ambiguous');
    expect(prompt).toContain('List transactions only when asked, with limit 5');
    expect(prompt).toContain('Explain terminology and correct earlier wording without tools');
    expect(prompt).not.toContain('use get_native_balance');
    expect(prompt).not.toContain('Use get_token_balances');
  });

});
