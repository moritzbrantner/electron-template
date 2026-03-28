import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const USE_CASE_NAMESPACE_ROOTS = ['src/domain', 'features'];

const PROFILE_NAMESPACE_PATHS = [
  path.join('src/domain', 'profile', 'use-cases.ts'),
  path.join('features', 'profile', 'domain', 'use-cases.ts'),
];

describe('architecture: use-case namespace roots', () => {
  it('keeps profile use-cases in exactly one root', () => {
    const existingPaths = PROFILE_NAMESPACE_PATHS.filter((relativePath) => existsSync(path.resolve(relativePath)));

    expect(existingPaths.length).toBe(1);
  });

  it('documents supported roots for namespaced use-cases', () => {
    expect(USE_CASE_NAMESPACE_ROOTS).toEqual(['src/domain', 'features']);
  });
});
