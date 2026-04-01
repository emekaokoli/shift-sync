import cors from 'cors';
import express, { Express, json } from 'express';
import helmet from 'helmet';
import { createServer as createHttpServer, Server as HttpServer } from 'http';
import pino from 'pino-http';
import path from 'path';
import authRouter from './api/auth';
import locationsRouter from './api/locations';
import shiftsRouter from './api/shifts';
import skillsRouter from './api/skills';
import staffRouter from './api/staff';
import swapsRouter from './api/swaps';
import notificationsRouter from './api/notifications';
import db from './infrastructure/database';
import { errorHandler } from './infrastructure/errorHandler';
import { logger } from './infrastructure/logger';
import { apiLimiter } from './infrastructure/rateLimit';
import { ResponseUtils } from './infrastructure/response';
import { setupSocketIO } from './infrastructure/socket';

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin:
        process.env.NODE_ENV === 'production'
          ? process.env.FRONTEND_URL
          : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
      credentials: true,
    }),
  );
  app.use(helmet());
  app.use(apiLimiter);
  app.use(pino());
  app.use(json());
  app.set('db', db);

  // API Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/shifts', shiftsRouter);
  app.use('/api/v1/staff', staffRouter);
  app.use('/api/v1/swaps', swapsRouter);
  app.use('/api/v1/notifications', notificationsRouter);
  app.use('/api/v1/locations', locationsRouter);
  app.use('/api/v1/skills', skillsRouter);

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    const staticPath = path.join(__dirname, '../../web/dist');
    app.use(express.static(staticPath));
    
    // SPA fallback - serve index.html for non-API routes
    app.use('/*splat', (_, res) => {
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  // Health check
  app.get('/healthcheck', (_, res) => {
    res.sendStatus(200);
  });

  // 404 handler
  app.use('/*splat', (_, res) => {
    ResponseUtils.notFound(res, 'It seems you are lost, Route does not exist');
  });

  // Error handler
  app.use(errorHandler());

  return app;
}

export function createServer(app: Express): HttpServer {
  const httpServer = createHttpServer(app);
  const PORT = process.env.PORT || 1964;

  setupSocketIO(httpServer);

  httpServer.listen(PORT, () => {
    logger.info(`${process.env.APP_NAME} server started on port ${PORT}`);
    logger.info('WebSocket server ready');
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing server...');
    await db.destroy();
    httpServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  return httpServer;
}

const app = createApp();
createServer(app);
