/* eslint-disable no-console */
import 'dotenv/config';

function checkMissing(vars) {
  const missing = vars.reduce((arr, key) => {
    if (!process.env[key]) {
      arr.push(key);
    }
    return arr;
  }, []);

  if (missing.length) {
    console.log(`The following environment variables are not defined:`);
    for (const item of missing) {
      console.log(' - ', item);
    }
    process.exit(1);
  }
}

if (!process.env.SKIP_DB_CHECK && !process.env.DATABASE_TYPE) {
  checkMissing(['DATABASE_URL']);
}

if (process.env.CLOUD_URL) {
  checkMissing(['CLOUD_URL', 'CLICKHOUSE_URL', 'REDIS_URL']);
}

// Fork-local: since v3.5.0 every server route throws without APP_SECRET
// (src/lib/app-secret.ts), but `next build` skips that check. On Vercel the
// build would go green, check:db would migrate production, and the deployment
// would then return 500 on every route, /api/send included. Fail here, before
// check:db runs, instead.
if (process.env.VERCEL) {
  const appSecret = process.env.APP_SECRET?.trim();

  if (!appSecret || appSecret === 'replace-me-with-a-random-string') {
    console.log('APP_SECRET must be set in the Vercel environment for this deployment.');
    process.exit(1);
  }
}
