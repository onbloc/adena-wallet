export interface Question {
  index: number;
  question: string;
  answers: Answer[];
}

export interface Answer {
  answer: string;
  correct: boolean;
}
