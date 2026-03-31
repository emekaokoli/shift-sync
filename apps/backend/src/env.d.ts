declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string;
      PORT: number;
      APP_NAME: string;

      JWT_EXPIRES_IN: string;
      JWT_SECRET: string;
      JWT_PRIVATE_KEY: string;
      JWT_PUBLIC_KEY: string;

      DATABASE_PROD_URL: string;
      DATABASE_DEV_URL: string;
      DATABASE_TEST_URL: string;
    }
  }
}
