import {
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
} from '@jupiterone/integration-sdk-core';

import { IntegrationConfig } from '../types';
import { createAPIClient } from '../client';

export async function fetchAccountDetails({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);
  const accountKey = `godaddy:account:${instance.config.shopperId}`;
  const accountData = await apiClient.getAccountDetails();
  const accountEntity = await jobState.addEntity(
    createIntegrationEntity({
      entityData: {
        source: accountData,
        assign: {
          _key: accountKey,
          _type: 'godaddy_account',
          _class: 'Account',
          firstName: accountData.nameFirst,
          lastName: accountData.nameLast,
          name: `GoDaddy Account ${instance.config.shopperId}`,
          displayName: `GoDaddy Account ${instance.config.shopperId}`,
          email: accountData.email,
          owner: accountData.email,
          marketId: accountData.marketId,
          shopperId: accountData.shopperId,
          accountId: accountData.shopperId,
          id: accountData.shopperId,
          externalId: accountData.externalId,
        },
      },
    }),
  );

  await jobState.setData(accountKey, accountEntity);
}

export const accountSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-account',
    name: 'Fetch Account Details',
    entities: [
      {
        resourceName: 'Account',
        _type: 'godaddy_account',
        _class: 'Account',
      },
    ],
    relationships: [],
    dependsOn: [],
    executionHandler: fetchAccountDetails,
  },
];
