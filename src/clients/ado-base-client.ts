import * as azdev from 'azure-devops-node-api';
import { Config } from '../config.js';
import { handleAzureDevOpsError } from '../utils/error-handlers.js';
import { ApiResult } from '../types/index.js';

export abstract class AzureDevOpsBaseClient {
  protected connection: azdev.WebApi;
  protected config: Config;

  constructor(config: Config) {
    this.config = config;
    const authHandler = azdev.getPersonalAccessTokenHandler(config.pat);
    this.connection = new azdev.WebApi(config.organization, authHandler);
  }

  protected async handleApiCall<T>(
    operation: string,
    apiCall: () => Promise<T>
  ): Promise<ApiResult<T>> {
    try {
      const result = await apiCall();
      return { success: true, data: result };
    } catch (error) {
      return handleAzureDevOpsError(error, operation) as ApiResult<T>;
    }
  }

  protected async ensureInitialized(): Promise<void> {
    // Base initialization if needed
  }
}