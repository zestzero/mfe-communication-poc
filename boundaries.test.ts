import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'apps');
const appNames = ['host', 'product', 'cart', 'profile'] as const;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name === 'dist' || name === '@mf-types') {
      return [];
    }
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      return sourceFiles(full);
    }
    return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name) ? [full] : [];
  });
}

describe('app boundaries', () => {
  it('keeps every app from importing another app', () => {
    const hits: string[] = [];
    for (const appName of appNames) {
      const files = sourceFiles(path.join(appsDir, appName));
      const foreign = appNames
        .filter((other) => other !== appName)
        .flatMap((other) => [`@mfe/${other}`, `apps/${other}`]);
      for (const file of files) {
        const text = readFileSync(file, 'utf8');
        for (const token of foreign) {
          if (text.includes(token)) {
            hits.push(`${path.relative(appsDir, file)} includes ${token}`);
          }
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
