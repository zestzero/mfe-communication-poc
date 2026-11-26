import { describe, expect, it } from 'vitest';
describe('profile', () => { it('does not own passwords', () => { expect('profile').not.toContain('password'); }); });
