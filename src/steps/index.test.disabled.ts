import { createMockStepExecutionContext } from '@jupiterone/integration-sdk-testing';

import { IntegrationConfig } from '../types';
import { fetchDomains } from './domains';
import { fetchAccountDetails } from './account';

const DEFAULT_API_KEY = 'dummy-key';
const DEFAULT_API_SECRET = 'dummy-secret';
const DEFAULT_SHOPPER_ID = '123456789';

const integrationConfig: IntegrationConfig = {
  apiKey: process.env.API_KEY || DEFAULT_API_KEY,
  apiSecret: process.env.API_SECRET || DEFAULT_API_SECRET,
  shopperId: process.env.SHOPPER_ID || DEFAULT_SHOPPER_ID,
};

jest.setTimeout(10000 * 9);

test('should collect data', async () => {
  const context = createMockStepExecutionContext<IntegrationConfig>({
    instanceConfig: integrationConfig,
  });

  // Simulates dependency graph execution.
  // See https://github.com/JupiterOne/sdk/issues/262.
  await fetchAccountDetails(context);
  await fetchDomains(context);

  // Review snapshot, failure is a regression
  expect({
    numCollectedEntities: context.jobState.collectedEntities.length,
    numCollectedRelationships: context.jobState.collectedRelationships.length,
    collectedEntities: context.jobState.collectedEntities,
    collectedRelationships: context.jobState.collectedRelationships,
    encounteredTypes: context.jobState.encounteredTypes,
  }).toMatchSnapshot();

  const accounts = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('Account'),
  );
  expect(accounts.length).toBeGreaterThan(0);
  expect(accounts).toMatchGraphObjectSchema({
    _class: ['Account'],
    schema: {
      additionalProperties: true,
      properties: {
        _type: { const: 'godaddy_account' },
        email: { type: 'string' },
        _rawData: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['email'],
    },
  });

  const domains = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('Domain'),
  );
  expect(domains.length).toBeGreaterThan(0);
  expect(domains).toMatchGraphObjectSchema({
    _class: ['Domain'],
    schema: {
      additionalProperties: true,
      properties: {
        _type: { const: 'godaddy_domain' },
        domainName: { type: 'string' },
        createdOn: { type: 'number' },
        expiresOn: { type: 'number' },
        _rawData: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['domainName', 'createdOn', 'expiresOn'],
    },
  });

  const domainRecords = context.jobState.collectedEntities.filter((e) =>
    e._class.includes('DomainRecord'),
  );
  expect(domainRecords.length).toBeGreaterThan(0);
  expect(domainRecords).toMatchGraphObjectSchema({
    _class: ['DomainRecord'],
    schema: {
      additionalProperties: true,
      properties: {
        _type: { const: 'godaddy_domain_record' },
        type: {
          type: 'string',
        },
        name: {
          type: 'string',
        },
        value: {
          type: 'string',
        },
        _rawData: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['type', 'name', 'value'],
    },
  });
});
