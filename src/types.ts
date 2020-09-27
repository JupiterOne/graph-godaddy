import { IntegrationInstanceConfig } from '@jupiterone/integration-sdk-core';

/**
 * Properties provided by the `IntegrationInstance.config`. This reflects the
 * same properties defined by `instanceConfigFields`.
 */
export interface IntegrationConfig extends IntegrationInstanceConfig {
  /**
   * The provider API key ID used to authenticate requests.
   */
  apiKey: string;

  /**
   * The provider API key secret used to authenticate requests.
   */
  apiSecret: string;

  /**
   * The GoDaddy customer number (aka shopper ID).
   *
   * `shopperId` is not the same as `customerId`.
   * `shopperId` is a number of max length 10 digits (ex: 1234567890)
   * whereas `customerId` is a UUIDv4 (ex: 295e3bc3-b3b9-4d95-aae5-ede41a994d13)
   *
   * For any API that needs a `customerId`, it can be obtained here:
   * https://developer.godaddy.com/doc/endpoint/shoppers#/v1/get
   */
  shopperId: string;
}
