import { DappMethod, DappRequest } from '../../../src/domain/dapp';
import { MAX_QUEUED_DAPP_REQUESTS, useDappRequestStore } from '../../../src/stores/dapp-request.store';

const request: DappRequest = { requestId: 'r', method: DappMethod.CONNECT, callbackUrl: 'x://', callbackOrigin: 'x:', dapp: { name: 'X' }, receivedAt: 0 };
const initial = useDappRequestStore.getState();

beforeEach(() => useDappRequestStore.setState(initial, true));

describe('useDappRequestStore', () => {
  it('starts empty', () => {
    expect(useDappRequestStore.getState()).toMatchObject({ queue: [], active: null, inFlight: false });
  });

  it('enqueues unique urls up to the limit', () => {
    const { enqueue } = useDappRequestStore.getState();

    for (let index = 0; index < MAX_QUEUED_DAPP_REQUESTS; index++) {
      expect(enqueue(`u${index}`)).toBe(true);
    }

    expect(enqueue('u0')).toBe(true);
    expect(enqueue('overflow')).toBe(false);
    expect(useDappRequestStore.getState().queue).toEqual(['u0', 'u1', 'u2', 'u3', 'u4']);
  });

  it('treats the active url as already queued', () => {
    const state = useDappRequestStore.getState();

    state.setActive({ url: 'a', request });
    expect(state.enqueue('a')).toBe(true);
    expect(useDappRequestStore.getState().queue).toEqual([]);
  });

  it('dequeues in FIFO order', () => {
    const state = useDappRequestStore.getState();

    expect(state.dequeue()).toBeNull();
    state.enqueue('a');
    state.enqueue('b');
    expect(state.dequeue()).toBe('a');
    expect(state.dequeue()).toBe('b');
    expect(state.dequeue()).toBeNull();
  });

  it('resets inFlight when the active request changes', () => {
    const state = useDappRequestStore.getState();

    state.setActive({ url: 'a', request });
    state.setInFlight(true);
    expect(useDappRequestStore.getState().inFlight).toBe(true);
    state.setActive(null);
    expect(useDappRequestStore.getState()).toMatchObject({ active: null, inFlight: false });
  });

  it('requeues the active request at the head', () => {
    const state = useDappRequestStore.getState();

    state.enqueue('b');
    state.setActive({ url: 'a', request });
    state.requeueActive();
    expect(useDappRequestStore.getState()).toMatchObject({ active: null, queue: ['a', 'b'] });
  });

  it('does not requeue without an active request or while in flight', () => {
    const state = useDappRequestStore.getState();

    state.requeueActive();
    expect(useDappRequestStore.getState().queue).toEqual([]);

    state.setActive({ url: 'a', request });
    state.setInFlight(true);
    state.requeueActive();
    expect(useDappRequestStore.getState()).toMatchObject({ active: { url: 'a' }, queue: [] });
  });
});
