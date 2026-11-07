import {QUESTIONS} from '../../src/core/questionnaire';

describe('security questionnaire', () => {
  it('asks the extension questions in order', () => {
    expect(QUESTIONS.map(question => question.index)).toEqual([1, 2, 3]);
  });

  it('has exactly one right answer per question', () => {
    for (const question of QUESTIONS) {
      expect(question.answers.filter(answer => answer.correct)).toHaveLength(
        1,
      );
    }
  });
});
