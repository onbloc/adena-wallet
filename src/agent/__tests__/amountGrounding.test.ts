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

  it.each([
    ['Send 5 million GNOT to carol', '5'],
    ['Send 5 thousand GNOT to carol', '5'],
    ['Send 5K GNOT to carol', '5'],
    ['carol에게 5만 GNOT 보내줘', '5'],
    ['Send five hundred and ten GNOT to carol', '10'],
    ['Send one hundred twenty GNOT to carol', '20'],
    ['Send one point five GNOT to carol', '5'],
    ['Send $5 worth of GNOT to carol', '5'],
    ['Send 5 dollars of GNOT to carol', '5'],
    ['Send 5 USD of GNOT to carol', '5'],
    ['Send 5 percent of my GNOT to carol', '5'],
    ['Send GNOT to carol for invoice 1234', '1234'],
    ['Send GNOT to carol for 2 pizzas', '2'],
  ])('does not ground a quantity changed by scale, unit or an unrelated number: %s', (text, amount) => {
    expect(exactAmountEvidence(text, amount, 'GNOT')).toBe(false);
    expect(pairedDecimalAmount(text, 'GNOT')).toBeUndefined();
  });

  it.each([
    ['Send 5 GNOT to Mina - thanks', '5', 'GNOT'],
    ['Send 5 USDC to carol', '5', 'USDC'],
    ['Send 5 USD to carol', '5', 'USD'],
    ['Send GNOT 5 to carol', '5', 'GNOT'],
    ['carol에게 GNOT 5개 보내줘', '5', 'GNOT'],
    ['Send 5 of GNOT to carol', '5', 'GNOT'],
    ['Send GNOT to carol\n2', '2', 'GNOT'],
    ['Send 5 of the token at gno.land/r/x/y to carol', '5', 'gno.land/r/x/y'],
    ['Allow carol to use up to 100 of my GNS', '100', 'GNS'],
    ['carol이 GNS를 10개까지 쓸 수 있게 승인해줘', '10', 'GNS'],
    ['안녕, 지금 carol한테 2 GNOT만 좀 보내줄 수 있을까?? 고마워!!', '2', 'GNOT'],
  ])('still grounds a quantity next to its asset: %s', (text, amount, asset) => {
    expect(exactAmountEvidence(text, amount, asset)).toBe(true);
  });

  it.each([
    ['Send 150% of my GNOT to carol', '150', '100'],
    ['Send 3/2 of my GNOT to carol', '3', '2'],
    ['Send 0% of my GNOT to carol', '0', '100'],
  ])('does not ground a share above the whole or empty: %s', (text, numerator, denominator) => {
    expect(fractionEvidence(text, { numerator, denominator })).toBe(false);
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
