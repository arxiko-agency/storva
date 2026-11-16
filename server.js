'use strict';
const { env, assertEnv } = require('./src/config/env');
const { connectDb, disconnectDb } = require('./src/config/db');
const { createApp } = require('./src/app');

async function main() {
  assertEnv();
  await connectDb();
  const server = createApp().listen(env.port, () => console.log(`[server] ${env.brandName} listening on :${env.port} (${env.nodeEnv})`));

  const reconcileJob = require('./src/services/reconcileJob').start(); // no-op unless online payments are configured and RECONCILE_ENABLED is not "false"

  const shutdown = async (sig) => {
    console.log(`[server] ${sig} received, shutting down`);
    if (reconcileJob) reconcileJob.stop();
    server.close(async () => { await disconnectDb(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  ['SIGINT', 'SIGTERM'].forEach((s) => process.on(s, () => shutdown(s)));
}

main().catch((e) => { console.error('[fatal]', e.message); process.exit(1); });
