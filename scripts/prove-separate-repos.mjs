import { execFileSync, spawn } from 'node:child_process';
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

const remoteRegistry = JSON.parse(readFileSync(path.join(root, 'config/remotes.json'), 'utf8'));
const isolatedHostPort = 3100;
for (const port of [isolatedHostPort, ...remoteRegistry.map((remote) => remote.port + 100)]) {
  try {
    const pids = execFileSync('lsof', ['-t', `-iTCP:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).trim();
    for (const pid of pids.split('\n').filter(Boolean)) {
      process.kill(Number(pid), 'SIGTERM');
    }
  } catch {
    // nothing is listening
  }
}
rmSync(out, { recursive: true, force: true });
mkdirSync(packs, { recursive: true });
await run('pnpm', ['build:packages'], { cwd: root });
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

const copies = remoteRegistry.map((remote) => ({ remote, dir: copyApp(`${remote.name}-mfe`) }));
const host = copyApp('host');

for (const dir of [...copies.map((copy) => copy.dir), host]) {
  await run('pnpm', ['install', '--prefer-offline'], { cwd: dir });
}
for (const { remote, dir } of copies) {
  const port = String(remote.port + 100);
  await run('pnpm', ['build'], { cwd: dir, env: { ...process.env, PORT: port, PUBLIC_ORIGIN: `http://127.0.0.1:${port}` } });
}

const remoteEnv = Object.fromEntries(
  remoteRegistry.map((remote) => [remote.env, `http://127.0.0.1:${remote.port + 100}/static/mf-manifest.json`]),
);

const servers = copies.map(({ remote, dir }) =>
  spawn('pnpm', ['serve'], { cwd: dir, stdio: 'inherit', env: { ...process.env, PORT: String(remote.port + 100) } }),
);

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

await Promise.all(remoteRegistry.map((remote) => waitFor(`http://127.0.0.1:${remote.port + 100}/static/mf-manifest.json`)));

try {
  await run('pnpm', ['build'], { cwd: host, env: { ...process.env, ...remoteEnv, PORT: String(isolatedHostPort) } });
  const hostServer = spawn('pnpm', ['serve'], {
    cwd: host,
    stdio: 'inherit',
    env: { ...process.env, ...remoteEnv, PORT: String(isolatedHostPort) },
  });
  servers.push(hostServer);
  await waitFor(`http://127.0.0.1:${isolatedHostPort}/products`);

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
