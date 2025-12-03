export interface AppConfig {
  app: {
    port: number;
    nodeEnv: string;
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  auth: {
    accessSecret: string;
    refreshSecret: string;
    encryptionKey: string;
  };
  sync: {
    webhookSecret: string;
  };
  integrations: {
    paystackSecret: string;
    mnotifyApiKey: string;
    fcm: {
      projectId: string;
      clientEmail: string;
      privateKey: string;
    };
    turn: {
      urls: string[];
      username: string;
      credential: string;
    };
  };
}
