import { accountSteps } from './account';
import { domainSteps } from './domains';

const integrationSteps = [...accountSteps, ...domainSteps];

export { integrationSteps };
