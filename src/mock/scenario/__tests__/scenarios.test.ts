import {
  ARGUMENT_SCENARIOS,
  ENGLISH_SCENARIOS,
  EXTRA_SCENARIOS,
  FOLLOW_UP_SCENARIOS,
  KOREAN_SCENARIOS,
  READ_SCENARIOS,
  REPEAT_SCENARIOS,
  ROUTING_SCENARIOS,
  SCENARIOS,
  TYPO_SCENARIOS,
} from '../scenarios';

const HANGUL = /[가-힣ㄱ-ㅎ]/;
// An address or the contact name must survive translation untouched.
const IDENTIFIERS = /g1[0-9a-z]{38}|carol/g;
const identifiersOf = (text: string) => text.match(IDENTIFIERS) ?? [];

describe('scenarios', () => {
  it('has a Korean twin for every English scenario, expecting exactly the same outcome', () => {
    expect(KOREAN_SCENARIOS).toHaveLength(ENGLISH_SCENARIOS.length);
    KOREAN_SCENARIOS.forEach((korean, i) => {
      expect(korean.name).toBe(`ko: ${ENGLISH_SCENARIOS[i].name}`);
      expect(korean.expected).toEqual(ENGLISH_SCENARIOS[i].expected);
      expect(typeof korean.prompt).toBe('string');
      expect(korean.prompt.trim()).not.toBe('');
    });
  });

  it('writes the Korean prompts in Korean, with the same recipient or contact as the English ones', () => {
    for (const [i, korean] of KOREAN_SCENARIOS.entries()) {
      expect(korean.prompt).toMatch(/[가-힣]/);
      expect(korean.prompt).not.toBe(ENGLISH_SCENARIOS[i].prompt);
      for (const token of identifiersOf(ENGLISH_SCENARIOS[i].prompt)) expect(korean.prompt).toContain(token);
    }
  });

  it('gives every scenario a distinct name and prompt', () => {
    const all = [...SCENARIOS, ...EXTRA_SCENARIOS];
    expect(new Set(all.map(({ name }) => name)).size).toBe(all.length);
    expect(new Set(all.map(({ prompt, before = [] }) => JSON.stringify([...before, prompt]))).size).toBe(all.length);
  });

  describe('typo scenarios', () => {
    it('cover English and Korean, each with a request that prepares something and one that must not', () => {
      for (const prefix of ['typo:', 'ko typo:']) {
        const set = TYPO_SCENARIOS.filter(({ name }) => name.startsWith(prefix));
        expect(set.some(({ expected }) => expected.kind === 'none')).toBe(true);
        expect(set.some(({ expected }) => expected.kind !== 'none')).toBe(true);
      }
      expect(TYPO_SCENARIOS.every(({ name }) => name.startsWith('typo:') || name.startsWith('ko typo:'))).toBe(true);
    });

    it('write the Korean ones in Korean and the English ones without Korean', () => {
      for (const { name, prompt } of TYPO_SCENARIOS) {
        expect(HANGUL.test(prompt)).toBe(name.startsWith('ko typo:'));
      }
    });

    it('cut the address by exactly one character where the address is the mistake', () => {
      const cutOff = TYPO_SCENARIOS.filter(({ name }) => name.includes('address missing'));
      expect(cutOff).toHaveLength(2);
      for (const { prompt } of cutOff) expect(prompt).toMatch(/g1[0-9a-z]{37}(?![0-9a-z])/);
    });
  });

  describe.each([
    ['argument', ARGUMENT_SCENARIOS],
    ['routing', ROUTING_SCENARIOS],
    ['read', READ_SCENARIOS],
    ['follow-up', FOLLOW_UP_SCENARIOS],
  ])('%s scenarios', (_label, set) => {
    const english = set.slice(0, set.length / 2);
    const korean = set.slice(set.length / 2);

    it('are the English scenarios followed by their Korean twins, expecting the same outcome', () => {
      expect(set.length % 2).toBe(0);
      korean.forEach((twin, i) => {
        expect(twin.name).toBe(`ko: ${english[i].name}`);
        expect(twin.expected).toEqual(english[i].expected);
        expect((twin.before ?? []).length).toBe((english[i].before ?? []).length);
      });
    });

    it('write the Korean twins in Korean and the English ones without Korean', () => {
      for (const { prompt, before = [] } of english) expect(HANGUL.test([...before, prompt].join(' '))).toBe(false);
      for (const { prompt, before = [] } of korean) expect(HANGUL.test([prompt, ...before].join(' '))).toBe(true);
    });

    it('keep every address and contact name in the Korean twin', () => {
      korean.forEach(({ prompt, before = [] }, i) => {
        const text = [...before, prompt].join(' ');
        for (const token of identifiersOf([...(english[i].before ?? []), english[i].prompt].join(' '))) expect(text).toContain(token);
      });
    });
  });

  it('expects only reads that the fake Onbloc and the wallet offer', () => {
    const offered = ['get_balance', 'list_account_transactions', 'get_nfts_balance', 'get_token_info'];
    for (const { expected } of EXTRA_SCENARIOS) {
      if (expected.kind !== 'answer') continue;
      for (const name of [...expected.reads.map((read) => read.name), ...(expected.allow ?? [])]) expect(offered).toContain(name);
    }
  });

  it('puts what only a later turn can answer after the turn it follows', () => {
    for (const scenario of FOLLOW_UP_SCENARIOS) expect(scenario.before?.length).toBeGreaterThan(0);
    for (const scenario of [...SCENARIOS, ...TYPO_SCENARIOS, ...ARGUMENT_SCENARIOS, ...ROUTING_SCENARIOS, ...READ_SCENARIOS]) {
      expect(scenario.before).toBeUndefined();
    }
  });

  it('runs a scenario without an account in both languages, and expects an error only there', () => {
    const all = [...SCENARIOS, ...EXTRA_SCENARIOS];
    const without = all.filter((scenario) => scenario.noAccount);

    expect(without.length).toBeGreaterThan(0);
    expect(without.filter(({ name }) => name.startsWith('ko: '))).toHaveLength(without.length / 2);
    expect(all.filter(({ expected }) => expected.kind === 'error').every(({ noAccount }) => noAccount === true)).toBe(true);
    // Both an answer that needs no wallet and a wallet action that does.
    expect(without.some(({ expected }) => expected.kind === 'answer')).toBe(true);
    expect(without.some(({ expected }) => expected.kind === 'error')).toBe(true);
  });

  it('repeats only English reads and follow-ups, which the other sets already hold', () => {
    const known = [...READ_SCENARIOS, ...FOLLOW_UP_SCENARIOS];
    expect(REPEAT_SCENARIOS.length).toBeGreaterThan(0);
    for (const scenario of REPEAT_SCENARIOS) {
      expect(known).toContain(scenario);
      expect(scenario.prompt).not.toMatch(HANGUL);
    }
  });
});
