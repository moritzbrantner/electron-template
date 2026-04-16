import fs from 'node:fs';
import path from 'node:path';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!key || process.env[key]) {
      continue;
    }

    process.env[key] = value.replace(/^['"]|['"]$/g, '');
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env'));

const token = process.env.MONOREPO_SUBTREE_DISPATCH_TOKEN;
const targetRepo = process.env.MONOREPO_TARGET_REPO ?? 'moritzbrantner/monorepo';
const eventType = process.env.MONOREPO_DISPATCH_EVENT_TYPE ?? 'subtree-update';

if (!token) {
  console.error(
    'Missing MONOREPO_SUBTREE_DISPATCH_TOKEN. Set it in the environment or in the local .env file.',
  );
  process.exit(1);
}

const response = await fetch(`https://api.github.com/repos/${targetRepo}/dispatches`, {
  method: 'POST',
  headers: {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'electron-template-monorepo-sync',
    'X-GitHub-Api-Version': '2022-11-28',
  },
  body: JSON.stringify({
    event_type: eventType,
    client_payload: {
      source_repository: process.env.GITHUB_REPOSITORY ?? 'moritzbrantner/electron-template',
      source_ref: process.env.GITHUB_REF_NAME ?? 'main',
      source_sha: process.env.GITHUB_SHA ?? null,
    },
  }),
});

if (!response.ok) {
  const body = await response.text();
  console.error(`Repository dispatch failed with ${response.status} ${response.statusText}`);
  if (body) {
    console.error(body);
  }
  process.exit(1);
}

console.log(`Repository dispatch sent to ${targetRepo} with event ${eventType}.`);
