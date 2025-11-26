import express, { Request, Response } from 'express';
import cors from 'cors';
import router from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', router);

// 404 handler for unknown routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

export default app;



