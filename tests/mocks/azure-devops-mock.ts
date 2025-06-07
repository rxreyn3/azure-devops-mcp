// Mock implementation of azure-devops-node-api for testing

import { 
  mockQueues, 
  mockQueueDetails, 
  mockPools, 
  mockAgents, 
  mockErrors,
  findMockQueue 
} from './ado-responses.js';

export class MockTaskAgentApi {
  private shouldSimulatePermissionError: boolean;
  private shouldSimulateServerError: boolean;
  private project: string;

  constructor(options: { 
    simulatePermissionError?: boolean; 
    simulateServerError?: boolean;
    project: string;
  }) {
    this.shouldSimulatePermissionError = options.simulatePermissionError || false;
    this.shouldSimulateServerError = options.simulateServerError || false;
    this.project = options.project;
  }

  async getAgentQueues(project: string): Promise<any> {
    if (this.shouldSimulateServerError) {
      throw new Error('Server error');
    }
    
    return mockQueues.value;
  }

  async getAgentQueue(queueId: number, project: string): Promise<any> {
    if (this.shouldSimulateServerError) {
      throw new Error('Server error');
    }
    
    const queue = findMockQueue(queueId);
    if (!queue) {
      throw new Error('Queue not found');
    }
    
    return mockQueueDetails;
  }

  async getAgentPools(): Promise<any> {
    if (this.shouldSimulatePermissionError) {
      throw {
        statusCode: 403,
        message: mockErrors.forbidden.message,
      };
    }
    
    if (this.shouldSimulateServerError) {
      throw new Error('Server error');
    }
    
    return mockPools.value;
  }

  async getAgents(poolId: number): Promise<any> {
    if (this.shouldSimulatePermissionError) {
      throw {
        statusCode: 403,
        message: mockErrors.forbidden.message,
      };
    }
    
    if (this.shouldSimulateServerError) {
      throw new Error('Server error');
    }
    
    return mockAgents.value;
  }
}

export class MockWebApi {
  private taskAgentApi: MockTaskAgentApi;

  constructor(url: string, authHandler: any, options?: any) {
    // Parse options from URL or auth handler if needed
    const simulatePermissionError = options?.simulatePermissionError || false;
    const simulateServerError = options?.simulateServerError || false;
    
    this.taskAgentApi = new MockTaskAgentApi({
      simulatePermissionError,
      simulateServerError,
      project: options?.project || 'test-project',
    });
  }

  async getTaskAgentApi(): Promise<MockTaskAgentApi> {
    // Simulate connection failure for certain URLs
    if (this.isInvalidUrl()) {
      throw new Error('Was there a typo in the url or port?');
    }
    
    return this.taskAgentApi;
  }

  private isInvalidUrl(): boolean {
    // Check if we're simulating connection errors
    return false; // For now, allow all connections in mock
  }
}

export function getPersonalAccessTokenHandler(token: string): any {
  return { token };
}