export default () => ({
  app: {
    port: parseInt(process.env.APP_PORT ?? '4000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
  database: {
    url: process.env.DATABASE_URL ?? 'postgres://hc:hcpassword@127.0.0.1:5434/healthconnect_desktop',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6381',
  },
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me',
    encryptionKey: process.env.ENCRYPTION_KEY ?? 'change-me',
  },
  sync: {
    webhookSecret: process.env.SYNC_WEBHOOK_SECRET ?? 'change-me',
  },
  integrations: {
    paystackSecret: process.env.PAYSTACK_SECRET_KEY ?? '',
    mnotifyApiKey: process.env.MNOTIFY_API_KEY ?? '',
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    fcm: {
      projectId: process.env.FIREBASE_PROJECT_ID ?? '',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
      privateKey: process.env.FIREBASE_PRIVATE_KEY ?? '',
    },
    turn: {
      urls: (process.env.TURN_SERVER_URLS ?? '').split(',').filter(Boolean),
      username: process.env.TURN_SERVER_USERNAME ?? '',
      credential: process.env.TURN_SERVER_CREDENTIAL ?? '',
    },
  },
});
