import axios from 'axios';
import { IntegrationConfig } from './types';
import {
  IntegrationProviderAuthenticationError,
  IntegrationLogger,
  IntegrationProviderAuthorizationError,
  IntegrationProviderAPIError,
} from '@jupiterone/integration-sdk-core';
import { URLSearchParams } from 'url';

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

  private MAX_RETRIES = 3;
  private RATE_LIMIT_SLEEP_TIME = 5000;

  constructor(
    readonly config: IntegrationConfig,
    readonly logger: IntegrationLogger,
  ) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.shopperId = config.shopperId;
  }

  private async getData<T>(
    path: string,
    args?: object,
  ): Promise<T | undefined> {
    const url = `https://${HOSTNAME}${path.startsWith('/') ? '' : '/'}${path}`;
    let retryCounter = 0;
    let abortRetry = false;

    do {
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
        const status = err.response?.status ?? 404;
        const statusText = err.response?.statusText ?? 'No Response Received';

        if (err.response?.status == 429) {
          // Documentation and testing show that we should receive a retryAfterSec
          // value in the event of a 429, but adding in a fallback sleep time in
          // the event that it's ever missing.
          const sleepTime = err.response?.data?.['retryAfterSec']
            ? err.response?.data?.['retryAfterSec'] * 1000
            : this.RATE_LIMIT_SLEEP_TIME;
          this.logger.info(
            `Encountered a rate limit.  Retrying in ${
              sleepTime / 1000
            } seconds.`,
          );
          retryCounter++;
          await new Promise((resolve) => setTimeout(resolve, sleepTime));
        } else if (err.response?.status === 401) {
          throw new IntegrationProviderAuthenticationError({
            status,
            statusText,
            endpoint: url,
          });
        } else if (err.response?.status == 403) {
          throw new IntegrationProviderAuthorizationError({
            status,
            statusText,
            endpoint: url,
          });
        } else if (err.response?.status == 404) {
          // Several comments online point to the possiblilty of certain DNS record
          // queries returning 404 errors depending on how a GoDaddy user has configured
          // their systems.  We need to eat these and continue so we don't miss out
          // on other data.  Previously these were silently being masked, but an
          // update to our error handling removed that.
          this.logger.warn(
            { url },
            'Unable to query GoDaddy endpoint due to 404 error.',
          );
          abortRetry = true;
        } else {
          throw new IntegrationProviderAPIError({
            status,
            statusText,
            endpoint: url,
          });
        }
      }
    } while (retryCounter < this.MAX_RETRIES && abortRetry === false);
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

  private withURLSeachParams(
    url: string,
    params: string | [string, string][] | Record<string, string>,
  ) {
    const qs = new URLSearchParams(params).toString();

    return `${url}${qs ? `?${qs}` : ''}`;
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
    const limit = 50;
    let hasNext = true;
    const URLSeachParams: { limit: string; offset: string } = {
      limit: String(limit),
      offset: '1',
    };
    const records: GoDaddyDomainRecord = [];

    do {
      const response = await this.getData<GoDaddyDomainRecord[]>(
        this.withURLSeachParams(
          `/v1/domains/${domainName}/records`,
          URLSeachParams,
        ),
      );

      if (!response || response.length === 0) {
        hasNext = false;
      }

      if (hasNext && response) {
        URLSeachParams.offset = String(Number(URLSeachParams.offset) + limit);

        records.push(...response);
      }
    } while (hasNext);

    return records;
  }

  public async iterateDomains(
    iteratee: ResourceIteratee<GoDaddyDomain>,
  ): Promise<void> {
    const limit = 50;
    let hasNext = true;
    const URLSeachParams: { limit: string; marker?: string } = {
      limit: String(limit),
    };

    do {
      const response = await this.getData<GoDaddyDomainRecord[]>(
        this.withURLSeachParams(`/v1/domains`, URLSeachParams),
      );

      if (!response || response.length === 0) {
        hasNext = false;
      }

      if (hasNext && response) {
        URLSeachParams.marker = response[response.length - 1].domain;

        for (const item of response || []) {
          await iteratee(item);
        }
      }
    } while (hasNext);
  }
}

export function createAPIClient(
  config: IntegrationConfig,
  logger: IntegrationLogger,
): APIClient {
  return new APIClient(config, logger);
}
