import { ENGLISH_SCENARIOS, KOREAN_SCENARIOS, SCENARIOS } from '../scenarios';

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
      const english = ENGLISH_SCENARIOS[i].prompt;
      // An address or the contact name must survive translation untouched.
      for (const token of english.match(/g1[0-9a-z]{38}|carol/g) ?? []) expect(korean.prompt).toContain(token);
    }
  });

  it('gives every scenario a distinct name and prompt', () => {
    expect(new Set(SCENARIOS.map(({ name }) => name)).size).toBe(SCENARIOS.length);
    expect(new Set(SCENARIOS.map(({ prompt }) => prompt)).size).toBe(SCENARIOS.length);
  });
});
