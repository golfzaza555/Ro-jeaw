// Applies netlify/database/migrations to the local dev database (.netlify/db).
// Stop `npm run dev` first; production migrations are applied by Netlify on deploy.
import { NetlifyDB } from '@netlify/database-dev';

const db = new NetlifyDB({ directory: '.netlify/db' });
await db.start();
const applied = await db.applyMigrations('netlify/database/migrations');
console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database already up to date.');
await db.stop();
