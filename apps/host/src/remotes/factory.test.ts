import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createFederationRemotes } from './factory';
import { remoteRegistry } from './registry.generated';

describe('remote registry', () => {
  it('builds federation urls from env and fails closed when one is missing', () => {
    const env = Object.fromEntries(remoteRegistry.map((remote) => [remote.env, `http://127.0.0.1:${remote.port}/static/mf-manifest.json`]));
    expect(createFederationRemotes(remoteRegistry, env).product).toContain('product@');
    expect(() => createFederationRemotes(remoteRegistry, {})).toThrow(/PRODUCT_REMOTE_URL/);
  });

  it('keeps a literal import and a protected redirect for every configured expose', () => {
    const imports = readFileSync(new URL('./imports.generated.ts', import.meta.url), 'utf8');
    const cartPage = readFileSync(new URL('../routes/cart/page.data.ts', import.meta.url), 'utf8');
    for (const remote of remoteRegistry) {
      for (const expose of [...remote.exposes, ...remote.persistent]) {
        expect(imports).toContain(`import('${remote.name}/${expose.export}')`);
      }
    }
    expect(cartPage).toContain("redirect('/products?notice=auth')");
  });
});
