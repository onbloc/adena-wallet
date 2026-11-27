import { exactAmountEvidence, fractionEvidence, pairedDecimalAmount } from '../amountEvidence';

describe('amount evidence', () => {
  it.each([
    ['Send all my GNOT to carol', '1', '1'],
    ['Send a quarter of my GNS to carol', '1', '4'],
    ['Send one third of my GNS to carol', '1', '3'],
    ['내 GNOT의 절반을 carol에게 보내줘', '1', '2'],
    ['내 GNOT 전부 carol에게 보내줘', '1', '1'],
    ['내 GNS의 4분의 1을 carol에게 보내줘', '1', '4'],
    ['내 GNS의 20%를 carol에게 보내줘', '1', '5'],
  ])('grounds an explicit balance share: %s', (text, numerator, denominator) => {
    expect(fractionEvidence(text, { numerator, denominator })).toBe(true);
  });

  it.each([
    ['Send half a GNOT to carol', '1', '2'],
    ['Send a quarter of my GNS and 2 GNOT to carol', '1', '4'],
    ['Send half a GNOT from my wallet to carol', '1', '2'],
    ['Send negative half my GNOT to carol', '1', '2'],
    ['Send one and a quarter of my GNOT to carol', '1', '4'],
    ['Send two quarter of my GNOT to carol', '1', '4'],
    ['내 GNOT의 -절반을 carol에게 보내줘', '1', '2'],
    ['내 GNS의 4분의 1과 2 GNOT을 보내줘', '1', '4'],
    ['내 GNS의 4분의 1을 carol에게 보내줘', '1', '2'],
    ['내 GNS의 20%를 carol에게 보내줘', '1', '2'],
    ['Send one and a half GNOT to carol', '1', '2'],
    ['carol에게 GNOT 1개 반 보내줘', '1', '2'],
  ])('does not turn a different or ambiguous request into a balance share: %s', (text, numerator, denominator) => {
    expect(fractionEvidence(text, { numerator, denominator })).toBe(false);
  });

  it.each([
    ['Send one and a half GNOT to carol', '1.5', 'GNOT'],
    ['Send two GNOT to carol', '2', 'GNOT'],
    ['carol에게 GNOT 1개 반 보내줘', '1.5', 'GNOT'],
    ['carol에게 GNOT 한 개 반 보내줘', '1.5', 'GNOT'],
  ])('grounds an exact quantity expressed in words: %s', (text, amount, asset) => {
    expect(exactAmountEvidence(text, amount, asset)).toBe(true);
    expect(pairedDecimalAmount(text, asset)).toBe(amount);
  });

  it.each([
    ['Send 1 XYZ to Mina, no wait, make it 2', '2', 'XYZ'],
    ['Mina에게 1 XYZ 보내줘, 아니 잠깐, 2 XYZ로 해줘', '2', 'XYZ'],
  ])('grounds the explicitly corrected amount: %s', (text, amount, asset) => {
    expect(exactAmountEvidence(text, amount, asset)).toBe(true);
    expect(exactAmountEvidence(text, '1', asset)).toBe(false);
  });

  it.each([
    'Send 1 XYZ or 2 XYZ to Mina',
    'Send -1 XYZ to Mina, no wait, make it 2',
    'Send 1 XYZ to Mina, no wait, make it 2 or 3',
    'Send 1 XYZ to Mina, "no wait, make it 2"',
  ])('does not infer a correction from ambiguous or quoted text: %s', text => {
    expect(exactAmountEvidence(text, '2', 'XYZ')).toBe(false);
  });

  it.each([
    ['Send one and a half GNOT to carol', '1', 'GNOT'],
    ['Send twenty one GNOT to carol', '1', 'GNOT'],
    ['Send 5 ONE to carol', '1', 'ONE'],
    ['carol에게 GNOT 1개 반 보내줘', '1', 'GNOT'],
    ['내 GNS의 20%를 carol에게 보내줘', '20', 'GNS'],
    ['Send -one GNOT to carol', '1', 'GNOT'],
    ['Send minus one GNOT to carol', '1', 'GNOT'],
    ['carol에게 GNOT -한 개 보내줘', '1', 'GNOT'],
    ['내 GNS의 4분의 1을 carol에게 보내줘', '1', 'GNS'],
    ['Send 2 or 3 GNOT to carol', '2', 'GNOT'],
  ])('does not mistake part of an expression or an asset for the amount: %s', (text, amount, asset) => {
    expect(exactAmountEvidence(text, amount, asset)).toBe(false);
  });

  it('rejects an exact amount beyond the supported decimal precision', () => {
    const amount = '1'.repeat(41);
    expect(exactAmountEvidence(`Send ${amount} GNOT to carol`, amount, 'GNOT')).toBe(false);
    expect(exactAmountEvidence(`Send ${'1'.repeat(40)} GNOT to carol`, '1'.repeat(40), 'GNOT')).toBe(true);
  });

  it('pairs a decimal with the whole asset name, not a suffix of another asset', () => {
    expect(pairedDecimalAmount('Send XGNOT 12.3 to carol', 'GNOT')).toBeUndefined();
    expect(pairedDecimalAmount('Send GNOT 12.3 to carol', 'GNOT')).toBe('12.3');
    expect(pairedDecimalAmount('Send 12.3 GNOT to carol', 'GNOT')).toBe('12.3');
  });
});
