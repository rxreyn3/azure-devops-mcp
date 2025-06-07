import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { 
  mockQueues, 
  mockQueueDetails, 
  mockPools, 
  mockAgents, 
  mockErrors,
  findMockQueue,
  findMockAgent 
} from './ado-responses.js';

interface MockServerOptions {
  port?: number;
  simulateErrors?: boolean;
  simulatePermissionErrors?: boolean;
  simulateNetworkDelay?: number;
}

export class MockAzureDevOpsServer {
  private server: Server | null = null;
  private port: number;
  private options: MockServerOptions;

  constructor(options: MockServerOptions = {}) {
    this.port = options.port || 8080;
    this.options = options;
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        // Simulate network delay if configured
        if (this.options.simulateNetworkDelay) {
          await new Promise(r => setTimeout(r, this.options.simulateNetworkDelay));
        }

        // Check authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Basic ')) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(mockErrors.unauthorized));
          return;
        }

        const url = new URL(req.url || '', `http://localhost:${this.port}`);
        const pathname = url.pathname;

        // Simulate server errors if configured
        if (this.options.simulateErrors && Math.random() < 0.5) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(mockErrors.serverError));
          return;
        }

        // Route handling
        try {
          if (pathname.includes('/distributedtask/queues')) {
            this.handleQueuesRoute(pathname, res);
          } else if (pathname.includes('/distributedtask/pools')) {
            this.handlePoolsRoute(pathname, res);
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Not found' }));
          }
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Internal server error' }));
        }
      });

      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  private handleQueuesRoute(pathname: string, res: ServerResponse) {
    const queueIdMatch = pathname.match(/\/queues\/(\d+)$/);
    
    if (queueIdMatch) {
      // Get specific queue
      const queueId = parseInt(queueIdMatch[1], 10);
      const queue = findMockQueue(queueId);
      
      if (queue) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockQueueDetails));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mockErrors.notFound));
      }
    } else if (pathname.endsWith('/queues')) {
      // List all queues
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockQueues));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Not found' }));
    }
  }

  private handlePoolsRoute(pathname: string, res: ServerResponse) {
    // Simulate permission errors for pool routes if configured
    if (this.options.simulatePermissionErrors) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockErrors.forbidden));
      return;
    }

    const poolAgentsMatch = pathname.match(/\/pools\/(\d+)\/agents$/);
    
    if (poolAgentsMatch) {
      // Get agents for a specific pool
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockAgents));
    } else if (pathname.endsWith('/pools')) {
      // List all pools
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockPools));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Not found' }));
    }
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getUrl(): string {
    return `http://localhost:${this.port}`;
  }
}