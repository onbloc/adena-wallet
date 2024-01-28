import axios from 'axios';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';

export async function fetchHealth(url: string): Promise<{ url: string; healthy: boolean }> {
  const healthy = await axios
    .get(url + '/health', { adapter: fetchAdapter, timeout: 5000 })
    .then((response) => response.status === 200)
    .catch(() => false);
  return {
    url,
    healthy,
  };
}
