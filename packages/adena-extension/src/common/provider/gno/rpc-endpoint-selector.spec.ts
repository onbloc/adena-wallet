import { RpcEndpointSelector } from './rpc-endpoint-selector';

const PRIMARY = 'https://rpc.primary.example';
const FALLBACK = 'https://rpc.fallback.example';

const transportError = (): Error => new TypeError('Failed to fetch');

describe('RpcEndpointSelector', () => {
  it('runs on the primary endpoint while it answers', async () => {
    const selector = new RpcEndpointSelector(PRIMARY, FALLBACK);
    const request = jest.fn().mockResolvedValue('ok');

    await expect(selector.run(request)).resolves.toBe('ok');
    await expect(selector.run(request)).resolves.toBe('ok');

    expect(request.mock.calls.map(([endpoint]) => endpoint)).toEqual([PRIMARY, PRIMARY]);
  });

  it('retries on the fallback endpoint after a transport failure, and stays there', async () => {
    const selector = new RpcEndpointSelector(PRIMARY, FALLBACK);
    const request = jest.fn().mockRejectedValueOnce(transportError()).mockResolvedValue('ok');

    await expect(selector.run(request)).resolves.toBe('ok');
    await expect(selector.run(request)).resolves.toBe('ok');

    expect(request.mock.calls.map(([endpoint]) => endpoint)).toEqual([PRIMARY, FALLBACK, FALLBACK]);
  });

  it('rotates back to the primary endpoint once the fallback also fails', async () => {
    const selector = new RpcEndpointSelector(PRIMARY, FALLBACK);
    const failing = jest.fn().mockRejectedValue(transportError());

    await expect(selector.run(failing)).rejects.toThrow('Failed to fetch');
    expect(failing.mock.calls.map(([endpoint]) => endpoint)).toEqual([PRIMARY, FALLBACK]);

    const succeeding = jest.fn().mockResolvedValue('ok');
    await expect(selector.run(succeeding)).resolves.toBe('ok');
    expect(succeeding).toHaveBeenCalledWith(PRIMARY);
  });

  it('treats a 5xx response as a transport failure but a 4xx as a chain answer', async () => {
    const serverDown = new RpcEndpointSelector(PRIMARY, FALLBACK);
    const onServerError = jest
      .fn()
      .mockRejectedValueOnce(new Error('Bad status on response: 502'))
      .mockResolvedValue('ok');

    await expect(serverDown.run(onServerError)).resolves.toBe('ok');
    expect(onServerError).toHaveBeenLastCalledWith(FALLBACK);

    const badRequest = new RpcEndpointSelector(PRIMARY, FALLBACK);
    const onClientError = jest.fn().mockRejectedValue(new Error('Bad status on response: 404'));

    await expect(badRequest.run(onClientError)).rejects.toThrow('Bad status on response: 404');
    expect(onClientError).toHaveBeenCalledTimes(1);
  });

  it('rethrows a chain-level error without leaving the primary endpoint', async () => {
    const selector = new RpcEndpointSelector(PRIMARY, FALLBACK);
    const request = jest.fn().mockRejectedValue(new Error('insufficient funds'));

    await expect(selector.run(request)).rejects.toThrow('insufficient funds');
    expect(request).toHaveBeenCalledTimes(1);
    expect(selector.active).toBe(PRIMARY);
  });

  it('does not retry when the network declares no fallback', async () => {
    const selector = new RpcEndpointSelector(PRIMARY);
    const request = jest.fn().mockRejectedValue(transportError());

    await expect(selector.run(request)).rejects.toThrow('Failed to fetch');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('ignores a fallback that repeats the primary endpoint', async () => {
    const selector = new RpcEndpointSelector(PRIMARY, PRIMARY);
    const request = jest.fn().mockRejectedValue(transportError());

    await expect(selector.run(request)).rejects.toThrow('Failed to fetch');
    expect(request).toHaveBeenCalledTimes(1);
  });
});
