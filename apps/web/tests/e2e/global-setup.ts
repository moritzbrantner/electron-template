import { execFileSync } from 'node:child_process';

import { applyE2EEnvironment } from '@/tests/e2e/environment';

async function globalSetup() {
  applyE2EEnvironment();

  execFileSync('bash', ['./scripts/ci/bootstrap-e2e-db.sh'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
}

export default globalSetup;
