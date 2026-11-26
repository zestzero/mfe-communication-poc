import { describe, expect, it } from 'vitest';
import { alternateUser, defaultUser } from '@mfe/contracts';
import { nextUser } from './roster';

describe('profile roster', () => {
  it('toggles between the two demo users', () => {
    expect(nextUser(defaultUser.id)).toEqual(alternateUser);
    expect(nextUser(alternateUser.id)).toEqual(defaultUser);
  });
});
