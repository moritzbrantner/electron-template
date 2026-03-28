import { execFileSync } from 'node:child_process';

import { applyE2EEnvironment } from '@/tests/e2e/environment';

async function globalTeardown() {
  applyE2EEnvironment();

  execFileSync('bash', ['./scripts/ci/bootstrap-e2e-db.sh', '--teardown'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
}

export default globalTeardown;
