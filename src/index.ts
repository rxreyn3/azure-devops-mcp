#!/usr/bin/env node
import { AzureDevOpsMCPServer } from './server.js';
import { validateConfig } from './config.js';

async function main() {
  try {
    const config = validateConfig();
    const server = new AzureDevOpsMCPServer(config);
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch(console.error);