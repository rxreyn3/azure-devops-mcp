import { describe, it, expect } from 'vitest';
import {
  mockQueueApiResponse,
  mockAgentApiResponse,
  mockBuildsResponse,
  mockPipelineRunResponse,
  createCustomQueue,
  createCustomAgent,
  createPagedResponse,
  cloneFixture,
  validateQueueFixture,
  validateAgentFixture,
  validateBuildFixture,
  filterAgentsByName,
  filterAgentsByStatus,
} from './sample-data.js';

describe('Test Fixtures', () => {
  describe('Queue Fixtures', () => {
    it('should provide valid queue data', () => {
      expect(mockQueueApiResponse).toHaveLength(3);
      expect(mockQueueApiResponse[0]).toHaveProperty('id', 1);
      expect(mockQueueApiResponse[0]).toHaveProperty('name', 'Default');
      expect(mockQueueApiResponse[0].pool).toHaveProperty('isHosted', false);
    });

    it('should validate queue fixture structure', () => {
      mockQueueApiResponse.forEach((queue) => {
        expect(validateQueueFixture(queue)).toBe(true);
      });
    });

    it('should create custom queues', () => {
      const customQueue = createCustomQueue({
        id: 999,
        name: 'Test Queue',
      });

      expect(customQueue.id).toBe(999);
      expect(customQueue.name).toBe('Test Queue');
      expect(validateQueueFixture(customQueue)).toBe(true);
    });
  });

  describe('Agent Fixtures', () => {
    it('should provide valid agent data', () => {
      expect(mockAgentApiResponse).toHaveLength(3);
      expect(mockAgentApiResponse[0]).toHaveProperty('id', 1);
      expect(mockAgentApiResponse[0]).toHaveProperty('name', 'Agent-001');
      expect(mockAgentApiResponse[0]).toHaveProperty('status', 2); // Online
    });

    it('should validate agent fixture structure', () => {
      mockAgentApiResponse.forEach((agent) => {
        expect(validateAgentFixture(agent)).toBe(true);
      });
    });

    it('should create custom agents', () => {
      const customAgent = createCustomAgent({
        id: 999,
        name: 'Test Agent',
        status: 2, // Offline
      });

      expect(customAgent.id).toBe(999);
      expect(customAgent.name).toBe('Test Agent');
      expect(customAgent.status).toBe(2);
      expect(validateAgentFixture(customAgent)).toBe(true);
    });

    it('should filter agents by name', () => {
      const filtered = filterAgentsByName(mockAgentApiResponse, 'build');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Build-Agent-01');
    });

    it('should filter agents by status', () => {
      const onlineAgents = filterAgentsByStatus(mockAgentApiResponse, true);
      expect(onlineAgents).toHaveLength(2);
      onlineAgents.forEach((agent) => {
        expect(agent.status).toBe(2); // Online
      });
    });
  });

  describe('Build Fixtures', () => {
    it('should provide valid build data', () => {
      expect(mockBuildsResponse).toHaveLength(3);
      expect(mockBuildsResponse[0]).toHaveProperty('id', 101);
      expect(mockBuildsResponse[0]).toHaveProperty('buildNumber', '20240101.1');
      expect(mockBuildsResponse[0].definition).toHaveProperty('id', 1);
    });

    it('should validate build fixture structure', () => {
      mockBuildsResponse.forEach((build) => {
        expect(validateBuildFixture(build)).toBe(true);
      });
    });
  });

  describe('Pipeline Fixtures', () => {
    it('should provide valid pipeline run data', () => {
      expect(mockPipelineRunResponse).toHaveProperty('id', 201);
      expect(mockPipelineRunResponse).toHaveProperty('name', 'CI Pipeline Run');
      expect(mockPipelineRunResponse.pipeline).toHaveProperty('id', 10);
    });
  });

  describe('Fixture Utilities', () => {
    it('should clone fixtures without mutation', () => {
      const original = mockQueueApiResponse;
      const cloned = cloneFixture(original);

      cloned[0].name = 'Modified Queue';

      expect(original[0].name).toBe('Default');
      expect(cloned[0].name).toBe('Modified Queue');
    });

    it('should create paged responses', () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
      const paged = createPagedResponse(items, 10, 0);

      expect(paged).toHaveLength(10);
      expect(paged.continuationToken).toBe('10');
      expect(paged[0]).toEqual({ id: 1, name: 'Item 1' });
    });

    it('should handle last page correctly', () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
      const paged = createPagedResponse(items, 10, 2); // Page 2 (items 20-25)

      expect(paged).toHaveLength(5);
      expect(paged.continuationToken).toBeUndefined();
      expect(paged[0]).toEqual({ id: 21, name: 'Item 21' });
    });
  });
});
