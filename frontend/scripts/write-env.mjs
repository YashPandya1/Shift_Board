import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiUrl = process.env.API_URL || 'http://localhost:3000/api';
const wsUrl = process.env.WS_URL || process.env.API_URL?.replace('/api', '') || 'http://localhost:3000';

const content = `// Auto-generated at build time — set API_URL in Netlify env vars
export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
  wsUrl: '${wsUrl}',
};
`;

writeFileSync(join(__dirname, '../src/environments/environment.prod.ts'), content);
console.log('Wrote environment.prod.ts with apiUrl:', apiUrl);
