import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/server/db/schema.ts',
  out: './drizzle',
  dialect: process.env.DATABASE_URL?.startsWith('postgres') ? 'postgresql' : 'sqlite',
  dbCredentials: process.env.DATABASE_URL?.startsWith('postgres')
    ? { url: process.env.DATABASE_URL }
    : { url: process.env.DATABASE_URL ?? './local.db' }
});
