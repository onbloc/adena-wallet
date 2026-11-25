import { buildWalletPrompt } from '../prompts';

it('instructs transaction reads to use the requested count or default to five', () => {
  expect(buildWalletPrompt({ approvals: false })).toContain('using the requested count as the limit, or 5 if no count was requested');
});
