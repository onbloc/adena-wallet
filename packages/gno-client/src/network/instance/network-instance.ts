import axios, { AxiosAdapter, AxiosInstance, AxiosResponse } from 'axios';
import { NetworkInstanceConfig } from '.';

export class NetworkInstance {
  private networkInstance: AxiosInstance;

  constructor(config: NetworkInstanceConfig, axiosAdapter?: AxiosAdapter) {
    this.networkInstance = axios.create({
      baseURL: config.host,
      timeout: config.timeout || 15000,
      adapter: axiosAdapter,
    });
  }

  public get = <T>(url: string) => {
    return this.networkInstance.get<any, AxiosResponse<T>, any>(url);
  };
}
