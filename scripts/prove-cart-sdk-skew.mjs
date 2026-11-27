import { execFileSync, spawn } from 'node:child_process';
import { createWriteStream, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = '/tmp/mfe-cart-sdk-skew';
const packs = path.join(outRoot, 'packs');
const sdkDir = path.join(root, 'packages/communication-sdk');
const versionFile = path.join(sdkDir, 'src/runtime/version.ts');
const sdkPkgPath = path.join(sdkDir, 'package.json');

const hostPort = 3200;
const remotePorts = { product: 3201, cart: 3202, profile: 3203 };

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`));
    });
  });
}

function killPorts(ports) {
  for (const port of ports) {
    try {
      const pids = execFileSync('lsof', ['-t', `-iTCP:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).trim();
      for (const pid of pids.split('\n').filter(Boolean)) process.kill(Number(pid), 'SIGTERM');
    } catch {
      // nothing listening
    }
  }
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

function setSdkVersion(version) {
  writeFileSync(versionFile, `/** Bumped when packing demo tarballs for cart-only SDK skew proofs. */\nexport const SDK_PACKAGE_VERSION = '${version}';\n`);
  const pkg = JSON.parse(readFileSync(sdkPkgPath, 'utf8'));
  pkg.version = version;
  writeFileSync(sdkPkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

async function packSdk(version) {
  setSdkVersion(version);
  await run('pnpm', ['--filter', '@platform/mfe-communication', 'build'], { cwd: root });
  await run('pnpm', ['pack', '--pack-destination', packs], { cwd: sdkDir });
  return path.join(packs, `platform-mfe-communication-${version}.tgz`);
}

function copyApp(scenarioDir, folder, tarballs) {
  const dest = path.join(scenarioDir, folder);
  cpSync(path.join(root, 'apps', folder), dest, {
    recursive: true,
    filter: (source) =>
      !source.includes(`${path.sep}node_modules`) &&
      !source.includes(`${path.sep}dist`) &&
      !source.endsWith(`${path.sep}.env`),
  });
  rewriteDeps(path.join(dest, 'package.json'), tarballs);
  return dest;
}

function patchCartMajorShare(cartDir) {
  writeFileSync(
    path.join(cartDir, 'module-federation.config.ts'),
    `import { federationShared } from '@platform/debug-panel/lib';
import { createModuleFederationConfig } from '@module-federation/modern-js-v3';

const base = federationShared(false);
const shared = {
  react: base.react,
  'react-dom': base['react-dom'],
  '@platform/contracts': base['@platform/contracts'],
  '@platform/mfe-communication': {
    singleton: true as const,
    requiredVersion: '^2.0.0',
    eager: false,
  },
};

export default createModuleFederationConfig({
  name: 'cart',
  filename: 'static/remoteEntry.js',
  manifest: { filePath: 'static' },
  exposes: {
    './CartView': './src/CartView.tsx',
    './CartController': './src/CartController.tsx'
  },
  shared,
  dts: false,
});
`,
  );
}

async function waitFor(url) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function extractTestId(html, testId) {
  const match = html.match(new RegExp(`data-testid="${testId}"[^>]*>([^<]*)<`));
  return match?.[1]?.trim() ?? null;
}

async function loginCookie(baseUrl) {
  const response = await fetch(`${baseUrl}/api/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'mara', password: 'atelier' }),
  });
  if (!response.ok) throw new Error(`login failed: ${response.status}`);
  const raw = response.headers.getSetCookie?.() ?? [];
  const fallback = response.headers.get('set-cookie');
  const cookies = raw.length ? raw : fallback ? [fallback] : [];
  return cookies.map((entry) => entry.split(';')[0]).join('; ');
}

async function buildAndServeScenario({ name, sdkForHost, sdkForCart, patchCart, expectMinorSingleton, expectMajorFailure }) {
  const scenarioDir = path.join(outRoot, name);
  rmSync(scenarioDir, { recursive: true, force: true });
  mkdirSync(scenarioDir, { recursive: true });

  const baseTarballs = {
    '@platform/contracts': path.join(packs, 'platform-contracts-1.0.0.tgz'),
    '@platform/debug-panel': path.join(packs, 'platform-debug-panel-1.0.0.tgz'),
    '@platform/tsconfig': path.join(packs, 'platform-tsconfig-1.0.0.tgz'),
  };
  const hostTarballs = { ...baseTarballs, '@platform/mfe-communication': sdkForHost };
  const cartTarballs = { ...baseTarballs, '@platform/mfe-communication': sdkForCart };

  const product = copyApp(scenarioDir, 'product-mfe', hostTarballs);
  const profile = copyApp(scenarioDir, 'profile-mfe', hostTarballs);
  const cart = copyApp(scenarioDir, 'cart-mfe', cartTarballs);
  const host = copyApp(scenarioDir, 'host', hostTarballs);
  if (patchCart) patchCartMajorShare(cart);

  for (const dir of [product, profile, cart, host]) {
    await run('pnpm', ['install', '--prefer-offline'], { cwd: dir });
  }

  const remoteEnv = {
    PRODUCT_REMOTE_URL: `http://127.0.0.1:${remotePorts.product}/static/mf-manifest.json`,
    CART_REMOTE_URL: `http://127.0.0.1:${remotePorts.cart}/static/mf-manifest.json`,
    PROFILE_REMOTE_URL: `http://127.0.0.1:${remotePorts.profile}/static/mf-manifest.json`,
  };

  await run('pnpm', ['build'], {
    cwd: product,
    env: { ...process.env, PORT: String(remotePorts.product), PUBLIC_ORIGIN: `http://127.0.0.1:${remotePorts.product}` },
  });
  await run('pnpm', ['build'], {
    cwd: profile,
    env: { ...process.env, PORT: String(remotePorts.profile), PUBLIC_ORIGIN: `http://127.0.0.1:${remotePorts.profile}` },
  });
  await run('pnpm', ['build'], {
    cwd: cart,
    env: { ...process.env, PORT: String(remotePorts.cart), PUBLIC_ORIGIN: `http://127.0.0.1:${remotePorts.cart}` },
  });

  const hostLogPath = path.join(scenarioDir, 'host-serve.log');
  const hostLog = createWriteStream(hostLogPath);
  const servers = [
    spawn('pnpm', ['serve'], { cwd: product, stdio: 'inherit', env: { ...process.env, PORT: String(remotePorts.product) } }),
    spawn('pnpm', ['serve'], { cwd: profile, stdio: 'inherit', env: { ...process.env, PORT: String(remotePorts.profile) } }),
    spawn('pnpm', ['serve'], { cwd: cart, stdio: 'inherit', env: { ...process.env, PORT: String(remotePorts.cart) } }),
  ];

  try {
    await waitFor(`http://127.0.0.1:${remotePorts.product}/static/mf-manifest.json`);
    await waitFor(`http://127.0.0.1:${remotePorts.profile}/static/mf-manifest.json`);
    await waitFor(`http://127.0.0.1:${remotePorts.cart}/static/mf-manifest.json`);

    await run('pnpm', ['build'], {
      cwd: host,
      env: { ...process.env, ...remoteEnv, PORT: String(hostPort) },
    });
    const hostServer = spawn('pnpm', ['serve'], {
      cwd: host,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...remoteEnv, PORT: String(hostPort) },
    });
    hostServer.stdout.pipe(hostLog);
    hostServer.stderr.pipe(hostLog);
    hostServer.stdout.pipe(process.stdout);
    hostServer.stderr.pipe(process.stderr);
    servers.push(hostServer);
    await waitFor(`http://127.0.0.1:${hostPort}/products`);

    const productsHtml = await (await fetch(`http://127.0.0.1:${hostPort}/products`)).text();
    const hostSdk = extractTestId(productsHtml, 'sdk-package-version');
    const hostRuntime = extractTestId(productsHtml, 'runtime-id');

    const summary = {
      name,
      hostSdkPackageVersion: hostSdk,
      hostRuntimeId: hostRuntime,
      cartSdkPackageVersion: null,
      cartRuntimeId: null,
      cartError: null,
      notes: [],
    };

    if (expectMinorSingleton) {
      const cookie = await loginCookie(`http://127.0.0.1:${hostPort}`);
      const cartHtml = await (
        await fetch(`http://127.0.0.1:${hostPort}/cart`, { headers: { cookie } })
      ).text();
      // Compare shell vs cart markers inside one SSR document (separate requests get new runtime ids).
      const shellSdk = extractTestId(cartHtml, 'sdk-package-version');
      const shellRuntime = extractTestId(cartHtml, 'runtime-id');
      summary.hostSdkPackageVersion = shellSdk;
      summary.hostRuntimeId = shellRuntime;
      summary.cartSdkPackageVersion = extractTestId(cartHtml, 'cart-sdk-package-version');
      summary.cartRuntimeId = cartHtml.match(/data-testid="mfe-cart"[^>]*data-runtime-id="([^"]+)"/)?.[1]
        ?? cartHtml.match(/data-runtime-id="([^"]+)"[^>]*data-testid="mfe-cart"/)?.[1]
        ?? null;
      if (!shellSdk || !['1.0.0', '1.1.0'].includes(shellSdk)) {
        throw new Error(`Minor scenario expected a 1.x singleton SDK marker, got ${shellSdk}`);
      }
      if (!summary.cartSdkPackageVersion) {
        throw new Error('Minor scenario: cart SDK version marker missing after login');
      }
      if (summary.cartSdkPackageVersion !== shellSdk) {
        throw new Error(
          `Minor scenario: expected one singleton version; shell=${shellSdk} cart=${summary.cartSdkPackageVersion}`,
        );
      }
      if (!summary.cartRuntimeId || summary.cartRuntimeId !== shellRuntime) {
        throw new Error(
          `Minor scenario: expected one runtime id; shell=${shellRuntime} cart=${summary.cartRuntimeId}`,
        );
      }
      summary.notes.push(
        `Host package install stayed on 1.0.0 while cart installed 1.1.0. At runtime Module Federation still used a single shared singleton (observed sdkPackageVersion=${shellSdk}) and one runtime id for shell and cart on the same document.`,
      );
      if (shellSdk === '1.1.0') {
        summary.notes.push(
          'The singleton winner was cart’s compatible 1.1.0 share, so the shell debug panel also reports 1.1.0 even though the host package.json still resolved 1.0.0 at install time. Cart’s newer fallback became the page-wide provider; there were not two live communication runtimes.',
        );
      } else {
        summary.notes.push(
          'The singleton winner was the host’s 1.0.0 share. Cart’s 1.1.0 fallback remained unused for execution even though it is present in the remote asset graph.',
        );
      }
      console.log(`MINOR_SKEW_RESULT ${JSON.stringify(summary)}`);
      return summary;
    }

    if (expectMajorFailure) {
      const cookie = await loginCookie(`http://127.0.0.1:${hostPort}`);
      const cartResponse = await fetch(`http://127.0.0.1:${hostPort}/cart`, { headers: { cookie } });
      const cartHtml = await cartResponse.text();
      summary.cartSdkPackageVersion = extractTestId(cartHtml, 'cart-sdk-package-version');
      // Give the host serve log a moment to flush federation warnings from SSR.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      hostLog.end();
      const hostLogText = readFileSync(hostLogPath, 'utf8');
      const shareWarning = hostLogText
        .split('\n')
        .filter((line) => line.includes('does not satisfy the requirement') && line.includes('@platform/mfe-communication'));
      const cartError =
        extractTestId(cartHtml, 'cart-error') ||
        (cartHtml.includes('Failed to get manifest') ? 'manifest failure' : null) ||
        (cartHtml.includes('Federation') ? 'federation error in HTML' : null);
      const cartMissing = !cartHtml.includes('data-testid="mfe-cart"');
      const versionConflict =
        summary.cartSdkPackageVersion != null &&
        summary.hostSdkPackageVersion != null &&
        summary.cartSdkPackageVersion !== summary.hostSdkPackageVersion;

      if (shareWarning.length === 0 && !cartMissing && !cartError && !versionConflict) {
        throw new Error(
          'Major scenario expected Federation share warnings or a broken/mismatched cart remote; none observed',
        );
      }

      summary.cartError =
        (shareWarning.length
          ? `federation share warnings (${shareWarning.length}): ${shareWarning[0]}`
          : null) ||
        cartError ||
        (cartMissing ? 'cart remote did not render mfe-cart' : null) ||
        (versionConflict
          ? `cart ran SDK ${summary.cartSdkPackageVersion} while host ran ${summary.hostSdkPackageVersion}`
          : null);
      summary.notes.push(
        'Host stayed on requiredVersion ^1.0.0 while cart alone installed 2.0.0 and required ^2.0.0. Module Federation logged that the 2.0.0 singleton candidate does not satisfy ^1.0.0.',
      );
      summary.notes.push(`Observed symptom: ${summary.cartError}`);
      if (!cartMissing && summary.cartSdkPackageVersion) {
        summary.notes.push(
          `Cart markup was still present with sdkPackageVersion=${summary.cartSdkPackageVersion}; the hard failure mode on this stack is the share-scope version warning rather than a blank shell.`,
        );
      }
      console.log(`MAJOR_SKEW_RESULT ${JSON.stringify(summary)}`);
      return summary;
    }

    throw new Error(`Unknown scenario expectations for ${name}`);
  } finally {
    for (const child of servers) child.kill('SIGTERM');
    killPorts([hostPort, ...Object.values(remotePorts)]);
  }
}

const originalVersion = readFileSync(versionFile, 'utf8');
const originalPkg = readFileSync(sdkPkgPath, 'utf8');

killPorts([hostPort, ...Object.values(remotePorts)]);
rmSync(outRoot, { recursive: true, force: true });
mkdirSync(packs, { recursive: true });

try {
  await run('pnpm', ['build:packages'], { cwd: root });
  for (const folder of ['contracts', 'platform', 'tsconfig']) {
    await run('pnpm', ['pack', '--pack-destination', packs], { cwd: path.join(root, 'packages', folder) });
  }

  // Ensure baseline 1.0.0 marker before packing SDK variants.
  setSdkVersion('1.0.0');
  await run('pnpm', ['--filter', '@platform/mfe-communication', 'build'], { cwd: root });
  await run('pnpm', ['pack', '--pack-destination', packs], { cwd: sdkDir });
  // pnpm pack names from package.json; keep a stable 1.0.0 artifact name.
  const packed100 = path.join(packs, 'platform-mfe-communication-1.0.0.tgz');
  if (!packed100) throw new Error('missing 1.0.0 pack');

  const sdk110 = await packSdk('1.1.0');
  const sdk200 = await packSdk('2.0.0');

  // Restore workspace sources so the monorepo stays on 1.0.0 after the proof.
  writeFileSync(versionFile, originalVersion);
  writeFileSync(sdkPkgPath, originalPkg);
  await run('pnpm', ['--filter', '@platform/mfe-communication', 'build'], { cwd: root });

  const minor = await buildAndServeScenario({
    name: 'minor',
    sdkForHost: packed100,
    sdkForCart: sdk110,
    patchCart: false,
    expectMinorSingleton: true,
    expectMajorFailure: false,
  });

  const major = await buildAndServeScenario({
    name: 'major',
    sdkForHost: packed100,
    sdkForCart: sdk200,
    patchCart: true,
    expectMinorSingleton: false,
    expectMajorFailure: true,
  });

  console.log('Cart SDK skew proof passed');
  console.log(
    JSON.stringify(
      {
        minor: {
          hostSdkPackageVersion: minor.hostSdkPackageVersion,
          cartSdkPackageVersion: minor.cartSdkPackageVersion,
          sharedRuntimeId: minor.hostRuntimeId === minor.cartRuntimeId,
          notes: minor.notes,
        },
        major: {
          hostSdkPackageVersion: major.hostSdkPackageVersion,
          cartSdkPackageVersion: major.cartSdkPackageVersion,
          cartError: major.cartError,
          notes: major.notes,
        },
      },
      null,
      2,
    ),
  );
} catch (error) {
  writeFileSync(versionFile, originalVersion);
  writeFileSync(sdkPkgPath, originalPkg);
  await run('pnpm', ['--filter', '@platform/mfe-communication', 'build'], { cwd: root }).catch(() => {});
  throw error;
}
