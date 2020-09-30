import axios from 'axios';
import { IntegrationConfig } from './types';
import { IntegrationProviderAuthenticationError } from '@jupiterone/integration-sdk-core';

export type ResourceIteratee<T> = (each: T) => Promise<void> | void;

import { Opaque } from 'type-fest';
export type GoDaddyAccount = Opaque<any>;
export type GoDaddyDomain = Opaque<any>;
export type GoDaddyDomainRecord = Opaque<any>;

const HOSTNAME = 'api.godaddy.com';

export class APIClient {
  private apiKey: string;
  private apiSecret: string;
  private shopperId: string;

  constructor(readonly config: IntegrationConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.shopperId = config.shopperId;
  }

  private async getData<T>(
    path: string,
    args?: object,
  ): Promise<T | undefined> {
    const url = `https://${HOSTNAME}${path.startsWith('/') ? '' : '/'}${path}`;
    try {
      const { data } = await axios.get(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `sso-key ${this.apiKey}:${this.apiSecret}`,
        },
        params: args,
      });
      return data;
    } catch (err) {
      const response = err.response || {};
      if (response.status !== 404) {
        throw Object.assign(new Error(err.message), {
          url: url,
          status: response.status || err.status || 'UNKNOWN',
          statusText: response.statusText || err.statusText || 'UNKNOWN',
        });
      }
    }
  }

  public async verifyAuthentication(): Promise<void> {
    try {
      await this.getData<any>('v1/agreements');
    } catch (err) {
      throw new IntegrationProviderAuthenticationError({
        cause: err,
        endpoint: 'https://api.godaddy.com/v1/agreements',
        status: err.status,
        statusText: err.statusText,
      });
    }
  }

  public async getAccountDetails(): Promise<GoDaddyAccount> {
    return this.getData<GoDaddyAccount>(`/v1/shoppers/${this.shopperId}`);
  }

  public async getDomainDetails(domainName: string): Promise<GoDaddyDomain> {
    return this.getData<GoDaddyDomain>(`/v1/domains/${domainName}`);
  }

  public async getDomainRecords(
    domainName: string,
  ): Promise<GoDaddyDomainRecord[] | undefined> {
    return this.getData<GoDaddyDomainRecord[]>(
      `/v1/domains/${domainName}/records`,
    );
  }

  public async iterateDomains(
    iteratee: ResourceIteratee<GoDaddyDomain>,
  ): Promise<void> {
    const items = await this.getData<GoDaddyDomain[]>(`/v1/domains`);
    for (const item of items || []) {
      await iteratee(item);
    }
  }
}

export function createAPIClient(config: IntegrationConfig): APIClient {
  return new APIClient(config);
}
