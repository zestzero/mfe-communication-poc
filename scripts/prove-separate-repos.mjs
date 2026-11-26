import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = '/tmp/mfe-separate-repos';
const packs = path.join(out, 'packs');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`));
    });
  });
}

function rewriteDeps(pkgPath, tarballs) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  for (const section of ['dependencies', 'devDependencies']) {
    for (const name of Object.keys(pkg[section] ?? {})) {
      if (tarballs[name]) pkg[section][name] = `file:${tarballs[name]}`;
    }
  }
  pkg.pnpm = {
    ...(pkg.pnpm ?? {}),
    overrides: Object.fromEntries(Object.entries(tarballs).map(([name, file]) => [name, `file:${file}`])),
  };
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(packs, { recursive: true });
await run('pnpm', ['-r', '--filter', './packages/*', 'build'], { cwd: root });
for (const folder of ['contracts', 'communication-sdk', 'platform', 'tsconfig']) {
  await run('pnpm', ['pack', '--pack-destination', packs], { cwd: path.join(root, 'packages', folder) });
}

const tarballs = {
  '@platform/contracts': path.join(packs, 'platform-contracts-1.0.0.tgz'),
  '@platform/mfe-communication': path.join(packs, 'platform-mfe-communication-1.0.0.tgz'),
  '@platform/debug-panel': path.join(packs, 'platform-debug-panel-1.0.0.tgz'),
  '@platform/tsconfig': path.join(packs, 'platform-tsconfig-1.0.0.tgz'),
};

function copyApp(folder) {
  const dest = path.join(out, folder);
  cpSync(path.join(root, 'apps', folder), dest, {
    recursive: true,
    filter: (source) => !source.includes(`${path.sep}node_modules`) && !source.includes(`${path.sep}dist`) && !source.endsWith(`${path.sep}.env`),
  });
  rewriteDeps(path.join(dest, 'package.json'), tarballs);
  return dest;
}

const product = copyApp('product-mfe');
const cart = copyApp('cart-mfe');
const profile = copyApp('profile-mfe');
const host = copyApp('host');

for (const dir of [product, cart, profile, host]) {
  await run('pnpm', ['install', '--prefer-offline'], { cwd: dir });
}
await run('pnpm', ['build'], { cwd: product, env: { ...process.env, PORT: '3101', PUBLIC_ORIGIN: 'http://127.0.0.1:3101' } });
await run('pnpm', ['build'], { cwd: cart, env: { ...process.env, PORT: '3102', PUBLIC_ORIGIN: 'http://127.0.0.1:3102' } });
await run('pnpm', ['build'], { cwd: profile, env: { ...process.env, PORT: '3103', PUBLIC_ORIGIN: 'http://127.0.0.1:3103' } });

const remoteEnv = {
  PRODUCT_REMOTE_URL: 'http://127.0.0.1:3101/static/mf-manifest.json',
  CART_REMOTE_URL: 'http://127.0.0.1:3102/static/mf-manifest.json',
  PROFILE_REMOTE_URL: 'http://127.0.0.1:3103/static/mf-manifest.json',
};

const servers = [
  spawn('pnpm', ['serve'], { cwd: product, stdio: 'inherit', env: { ...process.env, PORT: '3101' } }),
  spawn('pnpm', ['serve'], { cwd: cart, stdio: 'inherit', env: { ...process.env, PORT: '3102' } }),
  spawn('pnpm', ['serve'], { cwd: profile, stdio: 'inherit', env: { ...process.env, PORT: '3103' } }),
];

async function waitFor(url) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // server still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

await Promise.all([
  waitFor('http://127.0.0.1:3101/static/mf-manifest.json'),
  waitFor('http://127.0.0.1:3102/static/mf-manifest.json'),
  waitFor('http://127.0.0.1:3103/static/mf-manifest.json'),
]);

try {
  await run('pnpm', ['build'], { cwd: host, env: { ...process.env, ...remoteEnv, PORT: '3100' } });
  const hostServer = spawn('pnpm', ['serve'], {
    cwd: host,
    stdio: 'inherit',
    env: { ...process.env, ...remoteEnv, PORT: '3100' },
  });
  servers.push(hostServer);
  await waitFor('http://127.0.0.1:3100/products');

  const html = await (await fetch('http://127.0.0.1:3100/products')).text();
  if (!html.includes('Cedar Pour-Over')) {
    throw new Error('Isolated host SSR did not include the federated product name');
  }
  console.log('Isolated SSR contains Cedar Pour-Over');

  await run('pnpm', ['exec', 'playwright', 'test'], {
    cwd: root,
    env: { ...process.env, E2E_EXTERNAL: '1', E2E_BASE_URL: 'http://127.0.0.1:3100' },
  });
  console.log('Separate-repo proof passed');
} finally {
  for (const child of servers) child.kill('SIGTERM');
}
