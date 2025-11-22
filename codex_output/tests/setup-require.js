import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { jest } from '@jest/globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Anchor require to the admin spec folder so relative paths in CommonJS tests resolve correctly.
const adminSpecBase = path.join(__dirname, 'spec', 'admin', '__require.js');
globalThis.require = createRequire(adminSpecBase);

// Expose jest on the global object for CommonJS-oriented spec files.
if (!globalThis.jest) {
  globalThis.jest = jest;
}
