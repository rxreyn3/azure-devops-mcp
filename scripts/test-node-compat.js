// Test if the built module can be loaded in Node.js
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set minimal environment
process.env.ADO_ORGANIZATION = 'https://dev.azure.com/test';
process.env.ADO_PROJECT = 'TestProject';
process.env.ADO_PAT = 'test-token';

console.log('🧪 Testing Node.js compatibility...');

try {
  // Try to import the built module
  const indexPath = join(__dirname, '..', 'dist', 'index.js');
  console.log(`📦 Loading module: ${indexPath}`);
  
  await import(indexPath);
  
  // If we get here without errors, basic module loading works
  console.log('✅ Module loads successfully in Node.js');
  console.log('✅ ES modules are properly configured');
  console.log('✅ Dependencies are resolved correctly');
  
  // Exit before the server tries to connect to stdio
  console.log('\n📋 Node.js compatibility verified!');
  console.log('The server can be run with: node dist/index.js');
  process.exit(0);
} catch (error) {
  console.error('❌ Failed to load module:', error.message);
  console.error(error.stack);
  process.exit(1);
}