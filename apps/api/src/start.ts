import { createApp, createServer } from './index';

async function start() {
  try {
    console.log('Starting application...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PORT:', process.env.PORT);
    console.log('DATABASE_PROD_URL:', process.env.DATABASE_PROD_URL ? 'Set' : 'Not set');

    const app = createApp();
    createServer(app);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
