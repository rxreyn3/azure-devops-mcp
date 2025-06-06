import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables only in Node.js (Bun loads .env automatically)
if (typeof Bun === 'undefined') {
  const dotenv = await import('dotenv');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  dotenv.config({ path: join(__dirname, '..', '.env') });
}

export interface Config {
  organization: string;
  project: string;
  pat: string;
  logLevel: string;
}

export function validateConfig(): Config {
  const organization = process.env.ADO_ORGANIZATION;
  const project = process.env.ADO_PROJECT;
  const pat = process.env.ADO_PAT;
  const logLevel = process.env.LOG_LEVEL || 'info';

  const errors: string[] = [];

  if (!organization) {
    errors.push('ADO_ORGANIZATION is required');
  }

  if (!project) {
    errors.push('ADO_PROJECT is required');
  }

  if (!pat) {
    errors.push('ADO_PAT is required');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }

  // Clean up organization URL if needed
  let cleanOrg = organization!;
  if (cleanOrg.endsWith('/')) {
    cleanOrg = cleanOrg.slice(0, -1);
  }
  if (!cleanOrg.startsWith('https://')) {
    cleanOrg = `https://dev.azure.com/${cleanOrg}`;
  }

  return {
    organization: cleanOrg,
    project: project!,
    pat: pat!,
    logLevel,
  };
}