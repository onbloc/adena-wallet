import questionData from '@resources/questions/questions.json';
import type {Question} from '@types';

/** The extension's security questionnaire, shared so both ask the same. */
export const QUESTIONS: Question[] = [...questionData].sort(
  (a, b) => a.index - b.index,
);

/** After an answer is picked, others stay locked this long (as on the web). */
export const ANSWER_LOCK_SECONDS = 3;
