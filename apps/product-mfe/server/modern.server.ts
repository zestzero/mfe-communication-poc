export default {
  middlewares: [
    {
      name: 'federation-cors',
      handler: async (c: { header: (name: string, value: string) => void }, next: () => Promise<void>) => {
        c.header('Access-Control-Allow-Origin', '*');
        c.header('Access-Control-Allow-Headers', '*');
        await next();
      },
    },
  ],
};
