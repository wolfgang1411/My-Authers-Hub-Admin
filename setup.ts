import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env variables
dotenv.config();

const envDir = path.join(__dirname, 'src/environments');

// Ensure environments directory exists
if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

const apiUrl = process.env['API_URL'] || 'http://localhost:3000/';
const isProd = process.env['NODE_ENV'] === 'production';

// environment.ts
const envFile = `export const environment = {
  production: undefined as any,
  apiUrl: undefined as any,
  i18nHash: undefined as any
};
`;

// environment.prod.ts
const prodEnvFile = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
  i18nHash: ${new Date().valueOf()},
};
`;

fs.writeFileSync(path.join(envDir, 'environment.ts'), envFile);
fs.writeFileSync(path.join(envDir, 'environment.prod.ts'), prodEnvFile);

console.log('✅ Environment files generated successfully!');
console.log(`🌍 API_URL: ${apiUrl}`);
