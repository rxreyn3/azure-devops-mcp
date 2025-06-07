// Mock responses for Azure DevOps API endpoints

export const mockQueues = {
  count: 3,
  value: [
    {
      id: 1,
      name: 'Default',
      poolIsHosted: true,
      pool: {
        id: 1,
        name: 'Azure Pipelines',
        poolType: 'automation',
        size: 10,
        isHosted: true,
      },
    },
    {
      id: 2,
      name: 'Self-Hosted',
      poolIsHosted: false,
      pool: {
        id: 2,
        name: 'Self-Hosted Pool',
        poolType: 'automation',
        size: 5,
        isHosted: false,
      },
    },
    {
      id: 3,
      name: 'Special Characters Test (空格)',
      poolIsHosted: false,
      pool: {
        id: 3,
        name: 'Special-Pool',
        poolType: 'automation',
        size: 1,
        isHosted: false,
      },
    },
  ],
};

export const mockQueueDetails = {
  id: 1,
  name: 'Default',
  poolIsHosted: true,
  pool: {
    id: 1,
    name: 'Azure Pipelines',
    poolType: 'automation',
    size: 10,
    isHosted: true,
    createdOn: '2023-01-01T00:00:00Z',
    autoProvision: false,
    autoUpdate: true,
  },
};

export const mockPools = {
  count: 3,
  value: [
    {
      id: 1,
      name: 'Azure Pipelines',
      poolType: 'automation',
      size: 10,
      isHosted: true,
      createdOn: '2023-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Self-Hosted Pool',
      poolType: 'automation',
      size: 5,
      isHosted: false,
      createdOn: '2023-01-01T00:00:00Z',
    },
    {
      id: 3,
      name: 'Special-Pool',
      poolType: 'automation',
      size: 1,
      isHosted: false,
      createdOn: '2023-01-01T00:00:00Z',
    },
  ],
};

export const mockAgents = {
  count: 3,
  value: [
    {
      id: 101,
      name: 'agent-001',
      version: '3.225.0',
      status: 'online',
      enabled: true,
      systemCapabilities: {
        'Agent.ComputerName': 'BUILD-01',
        'Agent.OS': 'Linux',
        'Agent.OSArchitecture': 'X64',
      },
      userCapabilities: {},
      assignedRequest: null,
    },
    {
      id: 102,
      name: 'agent-002',
      version: '3.225.0',
      status: 'offline',
      enabled: true,
      systemCapabilities: {
        'Agent.ComputerName': 'BUILD-02',
        'Agent.OS': 'Windows_NT',
        'Agent.OSArchitecture': 'X64',
      },
      userCapabilities: {
        node: '18.x',
        docker: 'true',
      },
      assignedRequest: null,
    },
    {
      id: 103,
      name: 'special-agent (テスト)',
      version: '3.225.0',
      status: 'online',
      enabled: false,
      systemCapabilities: {
        'Agent.ComputerName': 'BUILD-03',
        'Agent.OS': 'Darwin',
        'Agent.OSArchitecture': 'ARM64',
      },
      userCapabilities: {},
      assignedRequest: {
        requestId: 12345,
        planType: 'Build',
        definition: {
          id: 10,
          name: 'CI Pipeline',
        },
      },
    },
  ],
};

export const mockErrors = {
  unauthorized: {
    $id: '1',
    innerException: null,
    message: 'VS800075: The project with id \'test-project\' does not exist, or you do not have permission to access it.',
    typeName: 'Microsoft.TeamFoundation.Core.WebApi.ProjectDoesNotExistException',
    typeKey: 'ProjectDoesNotExistException',
    errorCode: 0,
    eventId: 3000,
  },
  forbidden: {
    $id: '1',
    innerException: null,
    message: 'Access denied. You need organization-level permissions to access agent pools.',
    typeName: 'Microsoft.VisualStudio.Services.Common.VssUnauthorizedException',
    typeKey: 'VssUnauthorizedException',
    errorCode: 0,
    eventId: 3000,
  },
  notFound: {
    $id: '1',
    innerException: null,
    message: 'The requested queue was not found.',
    typeName: 'Microsoft.VisualStudio.Services.WebApi.VssResourceNotFoundException',
    typeKey: 'VssResourceNotFoundException',
    errorCode: 0,
    eventId: 3000,
  },
  serverError: {
    $id: '1',
    innerException: null,
    message: 'An unexpected error occurred on the server.',
    typeName: 'System.Exception',
    typeKey: 'Exception',
    errorCode: 0,
    eventId: 5000,
  },
};

// Helper function to get a queue by ID or name
export function findMockQueue(idOrName: string | number) {
  const queues = mockQueues.value;
  if (typeof idOrName === 'number') {
    return queues.find(q => q.id === idOrName);
  }
  return queues.find(q => q.name === idOrName);
}

// Helper function to find an agent by name
export function findMockAgent(name: string) {
  const agents = mockAgents.value;
  return agents.filter(a => 
    a.name.toLowerCase().includes(name.toLowerCase())
  );
}