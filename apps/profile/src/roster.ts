import { alternateUser, defaultUser, type User } from '@mfe/contracts';

export const roster: readonly User[] = [defaultUser, alternateUser];

export function nextUser(currentId: string): User {
  return roster.find((user) => user.id !== currentId) ?? alternateUser;
}
