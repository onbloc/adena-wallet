import { hostBusyStatusOf } from './agent-host-bridge';
import { AGENT_HOST_BUSY_EVENT } from './agent-host-protocol';

describe('hostBusyStatusOf', () => {
  it('turns host_busy into a disconnected status naming the browser', () => {
    expect(hostBusyStatusOf({ event: 'host_busy', browser: 'Brave Browser' })).toEqual({
      connected: false,
      error: AGENT_HOST_BUSY_EVENT,
      browser: 'Brave Browser',
    });
    expect(hostBusyStatusOf({ event: 'host_busy' })).toEqual({
      connected: false,
      error: AGENT_HOST_BUSY_EVENT,
    });
  });

  it('leaves requests and other messages to the handler', () => {
    for (const message of [
      { id: '1', method: 'ping' },
      { event: 'other' },
      null,
      'host_busy',
    ]) {
      expect(hostBusyStatusOf(message)).toBeNull();
    }
  });
});
