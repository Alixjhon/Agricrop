import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import db, { testConnection } from './models/db';
import { ensurePlantationSchema } from './models/ensurePlantationSchema';
import { cropRoutes } from './routes/cropRoutes';
import { diseaseRoutes } from './routes/diseaseRoutes';
import { chatRoutes } from './routes/chatRoutes';
import { historyRoutes } from './routes/historyRoutes';
import { authRoutes } from './routes/authRoutes';
import { locationRoutes } from './routes/locationRoutes';
import { plantationRoutes } from './routes/plantationRoutes';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5001;

const localDevOrigins = [
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8082',
  'http://127.0.0.1:8082',
];

const envOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...localDevOrigins, ...envOrigins]));

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/db', async (_req, res) => {
  try {
    const connected = await testConnection();
    const dbType = 'PostgreSQL';

    if (connected) {
      return res.json({
        status: 'OK',
        database: 'connected',
        type: dbType,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      type: dbType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('DB health error:', error);
    return res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

const checkDbConnection = (
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction
) => {
  if (req.path === '/health' || req.path === '/health/db') return next();
  if (db.waitingCount && db.waitingCount > 0) {
    console.warn(`Database pool warning: ${db.waitingCount} requests waiting`);
  }
  return next();
};

app.use(checkDbConnection);

app.use('/api', cropRoutes);
app.use('/api', diseaseRoutes);
app.use('/api', chatRoutes);
app.use('/api', historyRoutes);
app.use('/api', authRoutes);
app.use('/api', locationRoutes);
app.use('/api', plantationRoutes);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err);
    if (err?.message?.startsWith('CORS blocked')) {
      return res.status(403).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Something went wrong!' });
  }
);

const startServer = async () => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Health check available at /health');
    console.log('DB health check available at /health/db');
    console.log('Allowed CORS origins:', allowedOrigins);
  });

  try {
    const connected = await testConnection();
    if (connected) {
      console.log('Database connected successfully using PostgreSQL');
      // Make sure the new plantation columns exist (idempotent).
      try {
        await ensurePlantationSchema();
        console.log('Plantation schema verified.');
      } catch (error) {
        console.warn(
          'ensurePlantationSchema failed:',
          error instanceof Error ? error.message : error,
        );
      }
    } else {
      console.warn('Database connection test failed.');
      console.warn('Check your DATABASE_URL environment variable.');
    }
  } catch (error) {
    console.error('Failed to connect to database:', error);
    console.warn('Server is running without confirmed DB connection.');
    console.warn('Please verify your DATABASE_URL is correct and the database is accessible.');
  }
};

startServer();
