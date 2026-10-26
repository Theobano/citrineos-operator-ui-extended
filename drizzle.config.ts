import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url:
      process.env.AUTH_DATABASE_URL ||
      'postgresql://citrine:citrine@localhost:5432/citrine_auth',
  },
});
