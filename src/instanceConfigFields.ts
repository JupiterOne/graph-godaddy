import { IntegrationInstanceConfigFieldMap } from '@jupiterone/integration-sdk-core';

const instanceConfigFields: IntegrationInstanceConfigFieldMap = {
  shopperId: {
    type: 'string',
  },
  apiKey: {
    type: 'string',
  },
  apiSecret: {
    type: 'string',
    mask: true,
  },
};

export default instanceConfigFields;
