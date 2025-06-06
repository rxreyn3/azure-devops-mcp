#!/usr/bin/env node
import { AzureDevOpsMCPServer } from './server.js';
import { config } from './config.js';

async function main() {
  try {
    const server = new AzureDevOpsMCPServer(config);
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch(console.error);