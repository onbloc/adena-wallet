import { decodeBase64Url, encodeBase64Url } from '../../../src/deeplink/base64url';

describe('base64url', () => {
  it.each(['', 'a', 'ab', 'abc', 'abcd', '한글 ✓ 🙂', '{"x":"???>>>"}'])('round-trips %p', (text) => {
    expect(decodeBase64Url(encodeBase64Url(text))).toBe(text);
  });

  it('uses the url-safe alphabet without padding', () => {
    const encoded = encodeBase64Url('???>>>');

    expect(encoded).toBe('Pz8_Pj4-');
    expect(encodeBase64Url('a')).toBe('YQ');
  });

  it('decodes standard base64 with or without padding', () => {
    expect(decodeBase64Url('YQ==')).toBe('a');
    expect(decodeBase64Url('YQ')).toBe('a');
    expect(decodeBase64Url('Pz8/Pj4+')).toBe('???>>>');
  });

  it('throws on invalid input', () => {
    expect(() => decodeBase64Url('@@@@')).toThrow();
    expect(() => decodeBase64Url('Y')).toThrow();
  });
});
