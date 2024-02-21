import zxcvbn from 'zxcvbn';

export interface EvaluatePasswordResult {
  valid: boolean;
  score: number;
  complexity: 'DISABLED' | 'WEEK' | 'MEDIUM' | 'STRONG';
}

/**
 * A password is considered verified when the password complexity score is 1 or greater.
 *
 * @param password
 * @returns @EvaluatePasswordResult
 */
export function evaluatePassword(password: string): EvaluatePasswordResult {
  const { score } = zxcvbn(password);

  function getComplexityByScore(score: number): 'DISABLED' | 'WEEK' | 'MEDIUM' | 'STRONG' {
    if (score > 2) {
      return 'STRONG';
    }
    if (score > 1) {
      return 'MEDIUM';
    }
    if (score > 0) {
      return 'WEEK';
    }
    return 'DISABLED';
  }

  const valid = score > 0;
  const complexity = getComplexityByScore(score);

  return {
    valid,
    score,
    complexity,
  };
}
