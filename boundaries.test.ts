import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'apps');
const appNames = ['host', 'product-mfe', 'cart-mfe', 'profile-mfe'] as const;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name === 'dist' || name === '@mf-types') return [];
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name) ? [full] : [];
  });
}

describe('separate repositories', () => {
  it('does not use workspace links or another app source', () => {
    const hits: string[] = [];
    for (const appName of appNames) {
      const pkg = readFileSync(path.join(appsDir, appName, 'package.json'), 'utf8');
      if (pkg.includes('workspace:')) hits.push(`${appName} package.json uses workspace:`);
      for (const file of sourceFiles(path.join(appsDir, appName))) {
        const text = readFileSync(file, 'utf8');
        if (text.includes('workspace:')) hits.push(`${file} uses workspace:`);
        for (const other of appNames) {
          if (other === appName) continue;
          if (text.includes(`apps/${other}`) || text.includes(`@platform/${other}`)) {
            hits.push(`${path.relative(appsDir, file)} references ${other}`);
          }
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
