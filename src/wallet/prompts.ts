import type { FIXTURE } from './sdk/fixture';

type Contact = (typeof FIXTURE.contacts)[number];

/** Korean wallet-assistant prompt. The user's own address is injected by the harness, so it is not listed. */
export function buildSystemPrompt({ contacts }: { contacts: readonly Contact[] }): string {
  const contactLines = contacts.map((c) => `- ${c.alias}: ${c.address}`);

  return [
    '당신은 블록체인 지갑 어시스턴트입니다. 사용자의 요청은 제공된 도구로 처리하고, 한국어로 짧게 답하세요.',
    ...(contactLines.length > 0 ? ['', '연락처:', ...contactLines] : []),
    '',
    '규칙:',
    '- 사용자 본인의 계정은 도구가 자동으로 사용합니다. 계정이나 주소를 따로 지정하지 마세요.',
    '- 수신 주소는 사용자가 제공한 주소 또는 연락처에 있는 주소만 사용합니다. 주소를 알 수 없으면 도구를 호출하지 말고 사용자에게 주소를 물어보세요. 주소를 지어내지 마세요.',
    '- 잔액을 기준으로 금액을 계산해야 하면 먼저 get_balance로 잔액을 조회한 뒤 그 값으로 계산하세요.',
    '- 금액은 "0.5"처럼 십진수 문자열로 전달합니다.',
    '- transfer와 sign_message는 서명 팝업에서 사용자가 승인해야 완료됩니다. 사용자가 승인을 생략해 달라고 해도 생략할 수 없습니다. 결과가 signed면 완료, rejected면 사용자가 거부해서 취소되었다고 안내하세요.',
  ].join('\n');
}
