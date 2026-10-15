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
});
