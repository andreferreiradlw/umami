import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  datasource: {
    // Prefer the direct (non-pgBouncer) connection for migrations. Read it from
    // process.env: prisma's env() throws when a variable is unset, so
    // env('DIRECT_DATABASE_URL') ?? ... would never reach the fallback.
    url: process.env.DIRECT_DATABASE_URL || env('DATABASE_URL'),
  },
});
