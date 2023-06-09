import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
  convertProperties,
  getTime,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../types';
import { createHash } from 'crypto';

export async function fetchDomains({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config, logger);

  const accountKey = `godaddy:account:${instance.config.shopperId}`;
  const accountEntity = (await jobState.getData(accountKey)) as Entity;

  await apiClient.iterateDomains(async (domain) => {
    const domainDetails = await apiClient.getDomainDetails(domain.domain);
    const domainEntity = await jobState.addEntity(
      createIntegrationEntity({
        entityData: {
          source: domainDetails,
          assign: {
            ...convertProperties(domainDetails),
            _key: `godaddy-domain:${domain.domain}`,
            _type: 'godaddy_domain',
            _class: 'Domain',
            displayName: domainDetails.domain,
            domainName: domainDetails.domain,
            name: domainDetails.domain,
            createdOn: getTime(domainDetails.createdAt),
            expiresOn: getTime(domainDetails.expires),
            autoRenew: domainDetails.renewAuto,
            active: domainDetails.status === 'ACTIVE',
            id: domainDetails.domainId.toString(),
            registrar: 'godaddy',
            adminContactEmail: domainDetails.contactAdmin?.email,
            billingContactEmail: domainDetails.contactBilling?.email,
            registrantContactEmail: domainDetails.contactRegistrant?.email,
            techContactEmail: domainDetails.contactTech?.email,
            transferLock: domainDetails.transferProtected,
            locked: domainDetails.transferProtected,
          },
        },
      }),
    );

    await jobState.addRelationship(
      createDirectRelationship({
        _class: RelationshipClass.HAS,
        from: accountEntity,
        to: domainEntity,
      }),
    );

    if (domainEntity.active) {
      const domainRecords = await apiClient.getDomainRecords(domain.domain);

      for (const record of domainRecords || []) {
        const digest = createHash('sha1').update(record.data!).digest('hex');
        const domainRecordEntity = await jobState.addEntity(
          createIntegrationEntity({
            entityData: {
              source: record,
              assign: {
                _key: `godaddy-domain-record:${domain.domain}:${record.type}:${record.name}:${digest}`,
                _type: 'godaddy_domain_record',
                _class: 'DomainRecord',
                displayName: `${record.name}.${domain.domain}`,
                type: record.type,
                name: record.name,
                data: record.data,
                value: record.data,
                priority: record.priority,
                ttl: record.ttl,
                TTL: record.ttl,
              },
            },
          }),
        );

        await jobState.addRelationship(
          createDirectRelationship({
            _class: RelationshipClass.HAS,
            from: domainEntity,
            to: domainRecordEntity,
          }),
        );
      }
    }
  });
}

export const domainSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-domains',
    name: 'Fetch Domains and Records',
    entities: [
      {
        resourceName: 'Domain',
        _type: 'godaddy_domain',
        _class: 'Domain',
      },
      {
        resourceName: 'DomainRecord',
        _type: 'godaddy_domain_record',
        _class: 'DomainRecord',
      },
    ],
    relationships: [
      {
        _type: 'godaddy_account_has_domain',
        _class: RelationshipClass.HAS,
        sourceType: 'godaddy_account',
        targetType: 'godaddy_domain',
      },
      {
        _type: 'godaddy_domain_has_record',
        _class: RelationshipClass.HAS,
        sourceType: 'godaddy_domain',
        targetType: 'godaddy_domain_record',
      },
    ],
    dependsOn: ['fetch-account'],
    executionHandler: fetchDomains,
  },
];
