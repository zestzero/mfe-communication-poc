import { cpSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || !process.argv[index + 1]) throw new Error(`Missing --${name}`);
  return process.argv[index + 1];
}

const name = arg('name');
const route = arg('route');
const port = Number(arg('port'));
const protectedRoute = arg('protected') === 'true';
if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error('Remote name must be a lowercase slug');
if (!route.startsWith('/') || route.includes('//')) throw new Error('Route must be an app path');
if (!Number.isInteger(port) || port < 1024) throw new Error('Port must be an integer above 1024');

const registryPath = path.join(root, 'config/remotes.json');
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
if (registry.some((remote) => remote.name === name || remote.route === route || remote.port === port)) {
  throw new Error(`${name} collides with an existing remote name, route, or port`);
}

const destination = path.join(root, 'apps', `${name}-mfe`);
cpSync(path.join(root, 'templates/remote-mfe'), destination, { recursive: true });

function rewrite(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      rewrite(full);
      continue;
    }
    const text = readFileSync(full, 'utf8')
      .replaceAll('__NAME__', name)
      .replaceAll('__PORT__', String(port))
      .replaceAll('__ENV__', `${name.toUpperCase().replaceAll('-', '_')}_REMOTE_URL`);
    writeFileSync(full, text);
  }
}
rewrite(destination);
mkdirSync(destination, { recursive: true });

registry.push({
  name,
  env: `${name.toUpperCase().replaceAll('-', '_')}_REMOTE_URL`,
  port,
  route,
  protected: protectedRoute,
  exposes: [{ export: 'View', testId: `mfe-${name}`, loading: `Loading ${name}…` }],
  persistent: [],
});
writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

const generated = spawnSync(process.execPath, [path.join(root, 'scripts/generate-remotes.mjs')], { stdio: 'inherit' });
if (generated.status !== 0) process.exit(generated.status ?? 1);
console.log(`bootstrapped apps/${name}-mfe on ${route}`);
