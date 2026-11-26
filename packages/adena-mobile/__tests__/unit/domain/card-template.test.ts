import {
  cardTemplates,
  ChatStep,
  currentStep,
  periodChoices,
  scheduleAmountChoices,
  scheduledSendOf,
} from '../../../src/domain/card-template';
import { CardDuration, SpendPeriod } from '../../../src/domain/session-card';

const paths = {
  routerPath: 'gno.land/r/gnoswap/router',
  wrappedNativePackagePath: 'gno.land/r/gnoland/wugnot',
  dcaPath: 'gno.land/r/gnoswap/order/dca',
  limitPath: 'gno.land/r/gnoswap/order/limit',
};

describe('card templates', () => {
  it('offers only what the network supports, each with concrete realm paths', () => {
    expect(cardTemplates({}).map(template => template.id)).toEqual(['send']);
    expect(cardTemplates(paths).map(template => [template.id, template.permissions])).toEqual([
      ['send', [{ kind: 'send' }]],
      ['trade', [{ kind: 'realm', path: paths.routerPath }, { kind: 'realm', path: paths.wrappedNativePackagePath }]],
      ['orders', [{ kind: 'realm', path: paths.dcaPath }, { kind: 'realm', path: paths.limitPath }]],
    ]);
  });

  it('only offers resets that can happen within the card life and sends the limit can pay for', () => {
    expect(periodChoices(CardDuration.ONE_DAY)).toEqual([SpendPeriod.TOTAL, SpendPeriod.DAILY]);
    // 1 GNOT limit: 1 GNOT would leave nothing for the fee.
    expect(scheduleAmountChoices('1000000', 6)).toEqual(['0.1', '0.5']);
  });

  it('walks the questions in order, asking schedule questions only for sending cards', () => {
    const [send, trade] = cardTemplates(paths);

    expect(currentStep({})).toBe(ChatStep.TEMPLATE);
    expect(currentStep({ template: trade, limit: '1', duration: CardDuration.ONE_DAY, period: 0 })).toBe(ChatStep.CONFIRM);
    expect(currentStep({ template: send, limit: '1', duration: CardDuration.ONE_DAY, period: 0 })).toBe(ChatStep.SCHEDULE);
    expect(currentStep({ template: send, limit: '1', duration: CardDuration.ONE_DAY, period: 0, schedule: false })).toBe(ChatStep.CONFIRM);

    const scheduled = { template: send, limit: '1', duration: CardDuration.ONE_DAY, period: 0 as const, schedule: true };

    expect(currentStep(scheduled)).toBe(ChatStep.RECIPIENT);
    expect(currentStep({ ...scheduled, recipient: 'g1x' })).toBe(ChatStep.AMOUNT);
    expect(currentStep({ ...scheduled, recipient: 'g1x', amount: '100' })).toBe(ChatStep.DELAY);
    expect(scheduledSendOf({ ...scheduled, recipient: 'g1x', amount: '100', delaySeconds: 30 })).toEqual({ toAddress: 'g1x', amount: '100', delaySeconds: 30 });
  });
});
