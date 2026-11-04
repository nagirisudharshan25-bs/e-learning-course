import express, { type Request, type Response, type NextFunction } from 'express';
import { apiRouter } from './routes/api.ts';

export const app = express();

app.use(express.json());

// Request logging (sanitized, avoiding credential logging)
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    // console.log(`${req.method} ${req.path}`);
  }
  next();
});

// API Routes
app.use('/api', apiRouter);

// Any /api request not handled by apiRouter must return 404 JSON, never fall through
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `API endpoint ${req.method} ${req.originalUrl || req.url} was not found.`,
    statusCode: 404,
  });
});

// Centralized error handler avoiding raw database stack traces - strictly returns JSON
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({
    error: err.error || 'Server Error',
    message,
    statusCode,
  });
});
