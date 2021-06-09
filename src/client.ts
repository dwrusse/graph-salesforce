import { Connection, StandardSchema } from 'jsforce';

import { IntegrationProviderAuthenticationError } from '@jupiterone/integration-sdk-core';

import { IntegrationConfig } from './config';

export type ResourceIteratee<T> = (each: T) => Promise<void> | void;

/**
 * An APIClient maintains authentication state and provides an interface to
 * third party data APIs.
 *
 * It is recommended that integrations wrap provider data APIs to provide a
 * place to handle error responses and implement common patterns for iterating
 * resources.
 */
export class APIClient {
  constructor(readonly config: IntegrationConfig) {
    //Set up the connection
    this.setUpClient();
  }
  conn: Connection<StandardSchema>;

  /**
   * Set up the connection to Salesforce with oauth info
   */
  setUpClient(): void {
    this.conn = new Connection<StandardSchema>({
      oauth2: {
        // Default loginUrl points to "https://login.salesforce.com"
        // you can change loginUrl to connect to sandbox or prerelease env.
        // loginUrl : 'https://test.salesforce.com',
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        redirectUri: 'https://login.salesforce.com/services/oauth2/success', // TODO: May want to add this to config
      },
    });
  }

  public async verifyAuthentication(): Promise<void> {
    // TODO: Fix the error messages here
    try {
      await this.conn.login(
        this.config.clientUsername,
        this.config.clientPassword,
      );
    } catch (err) {
      // There is a serious issue authenticating with API
      throw new IntegrationProviderAuthenticationError({
        cause: err,
        endpoint: 'https://login.salesforce.com',
        status: '',
        statusText: '',
      });
    }
    await this.conn.logout();
  }

  /**
   * Iterates each user resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateUsers(
    iteratee: ResourceIteratee<StandardSchema['SObjects']['User']['Fields']>,
  ): Promise<void> {
    await this.conn.login(
      this.config.clientUsername,
      this.config.clientPassword,
    );
    const users = await this.conn.sobject('User').find();

    for (const user of users) {
      await iteratee(user);
    }
  }
}

export function createAPIClient(config: IntegrationConfig): APIClient {
  return new APIClient(config);
}
