const passwords: Record<string, string> = {
  mara: 'atelier',
  somchai: 'atelier',
};

const usernames: Record<string, string> = {
  mara: 'user-mara',
  somchai: 'user-somchai',
};

function sessionCookie(userId: string) {
  return `platform_session=${encodeURIComponent(userId)}; HttpOnly; Path=/; SameSite=Lax`;
}

export default {
  middlewares: [
    {
      name: 'platform-session',
      path: '/api/session',
      handler: async (c: {
        req: { method: string; json: () => Promise<{ username?: string; password?: string }> };
        json: (body: unknown, status?: number) => Response;
        header: (name: string, value: string) => void;
      }) => {
        if (c.req.method === 'DELETE') {
          c.header('Set-Cookie', 'platform_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
          return c.json({ auth: { status: 'anonymous', user: null } });
        }
        if (c.req.method !== 'POST') {
          return c.json({ message: 'Use POST to log in or DELETE to log out.' }, 405);
        }
        const body = await c.req.json();
        const userId = usernames[body.username ?? ''];
        if (!userId || passwords[body.username ?? ''] !== body.password) {
          return c.json({ message: 'Unauthorized' }, 401);
        }
        // Server compile is CommonJS and may rewrite bare specifier imports via bundler
        // aliases. Resolve the helpers entry from the app root at request time instead.
        const { pathToFileURL } = await import('node:url');
        const { createRequire } = await import('node:module');
        const require = createRequire(process.cwd() + '/package.json');
        const helpersUrl = pathToFileURL(require.resolve('@platform/debug-panel/lib')).href;
        const { userById } = await import(helpersUrl);
        const user = userById(userId);
        c.header('Set-Cookie', sessionCookie(userId));
        return c.json({ auth: { status: 'authenticated', user } });
      },
    },
  ],
};
