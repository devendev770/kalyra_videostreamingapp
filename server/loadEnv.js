import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '.env');
console.log(`[loadEnv] __dirname: ${__dirname}`);
console.log(`[loadEnv] Resolved .env path: ${envPath}`);
console.log(`[loadEnv] File exists: ${fs.existsSync(envPath)}`);

const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error(`[loadEnv] ERROR loading .env:`, result.error.message);
} else {
  console.log(`[loadEnv] Successfully loaded .env (${Object.keys(result.parsed || {}).length} variables)`);
}
