import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const outDir = path.join(rootDir, 'out');
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const productName = packageJson.productName ?? packageJson.name;
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

rmSync(outDir, { force: true, recursive: true });

const packageResult = spawnSync(pnpmCommand, ['package'], {
  cwd: rootDir,
  stdio: 'inherit',
});

if (packageResult.status !== 0) {
  process.exit(packageResult.status ?? 1);
}

const packagedAppDir = path.join(outDir, `${productName}-${process.platform}-${process.arch}`);

function assertExists(targetPath, message) {
  if (!existsSync(targetPath)) {
    throw new Error(`${message}: ${targetPath}`);
  }
}

function getAppPaths() {
  if (process.platform === 'darwin') {
    const appBundle = path.join(packagedAppDir, `${productName}.app`);

    return {
      executablePath: path.join(appBundle, 'Contents', 'MacOS', productName),
      packagePath: path.join(appBundle, 'Contents', 'Resources', 'app.asar'),
    };
  }

  if (process.platform === 'win32') {
    return {
      executablePath: path.join(packagedAppDir, `${productName}.exe`),
      packagePath: path.join(packagedAppDir, 'resources', 'app.asar'),
    };
  }

  return {
    executablePath: path.join(packagedAppDir, productName),
    packagePath: path.join(packagedAppDir, 'resources', 'app.asar'),
  };
}

const { executablePath, packagePath } = getAppPaths();

assertExists(packagedAppDir, 'Missing packaged application directory');
assertExists(executablePath, 'Missing packaged application executable');
assertExists(packagePath, 'Missing packaged application bundle');

console.log(`Verified packaged application at ${packagedAppDir}`);
