/** Fixed replies follow the user's language: Korean when the text has Hangul, English otherwise. */
export const localized = (userText: string, english: string, korean: string) =>
  /[\uac00-\ud7a3]/u.test(userText) ? korean : english;
