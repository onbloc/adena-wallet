import {ApprovalQueue} from '../../src/platform/approval-queue';

const dismissed = (message: any) => ({dismissed: message.key});
const request = (key: string) => ({key} as any);

describe('ApprovalQueue', () => {
  it('shows one request at a time, in order', async () => {
    const queue = new ApprovalQueue(dismissed);
    const seen: Array<string | null> = [];
    queue.subscribe(current => seen.push(current?.message.key ?? null));

    await queue.present('/a', request('1'), request('1-close'), jest.fn());
    await queue.present('/b', request('2'), request('2-close'), jest.fn());

    expect(queue.current()?.path).toBe('/a');
    expect(seen).toEqual([null, '1', '1']);
  });

  it('answers each request exactly once', async () => {
    const queue = new ApprovalQueue(dismissed);
    const sendResponse = jest.fn();
    await queue.present('/a', request('1'), request('1-close'), sendResponse);
    const id = queue.current()!.id;

    queue.resolve(id, request('approved'));
    queue.resolve(id, request('approved-again'));
    queue.reject(id);

    expect(sendResponse).toHaveBeenCalledTimes(1);
    expect(sendResponse).toHaveBeenCalledWith(request('approved'));
    expect(await queue.hasOpenApprovals()).toBe(false);
  });

  it('answers a rejection with the close message', async () => {
    const queue = new ApprovalQueue(dismissed);
    const sendResponse = jest.fn();
    await queue.present('/a', request('1'), request('1-close'), sendResponse);

    queue.reject(queue.current()!.id);

    expect(sendResponse).toHaveBeenCalledWith(request('1-close'));
  });

  it('fails every pending request when dismissed (e.g. on lock)', async () => {
    const queue = new ApprovalQueue(dismissed);
    const first = jest.fn();
    const second = jest.fn();
    await queue.present('/a', request('1'), request('1-close'), first);
    await queue.present('/b', request('2'), request('2-close'), second);

    await queue.dismissAll();

    expect(first).toHaveBeenCalledWith({dismissed: '1'});
    expect(second).toHaveBeenCalledWith({dismissed: '2'});
    expect(queue.current()).toBeNull();
  });

  it('keeps a request that is being broadcast out of dismissAll', async () => {
    const queue = new ApprovalQueue(dismissed);
    const broadcasting = jest.fn();
    const waiting = jest.fn();
    await queue.present('/a', request('1'), request('1-close'), broadcasting);
    await queue.present('/b', request('2'), request('2-close'), waiting);
    const id = queue.current()!.id;

    expect(queue.markInFlight(id)).toBe(true);
    // A newer page request or a lock dismisses pending requests.
    await queue.dismissAll();
    await queue.present('/c', request('3'), request('3-close'), jest.fn());

    expect(broadcasting).not.toHaveBeenCalled();
    expect(waiting).toHaveBeenCalledWith({dismissed: '2'});
    // The broadcast stays in front; the newer request waits behind it.
    expect(queue.current()).toMatchObject({id, inFlight: true});

    // Closing the sheet does not answer it either; the broadcast result does.
    queue.reject(id);
    expect(broadcasting).not.toHaveBeenCalled();
    queue.resolve(id, request('tx-success'));
    expect(broadcasting).toHaveBeenCalledWith(request('tx-success'));
    expect(queue.current()?.message.key).toBe('3');
  });

  it('refuses to mark a request that was already answered', async () => {
    const queue = new ApprovalQueue(dismissed);
    await queue.present('/a', request('1'), request('1-close'), jest.fn());
    const id = queue.current()!.id;

    await queue.dismissAll();

    expect(queue.markInFlight(id)).toBe(false);
  });
});
