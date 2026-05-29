import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import articleRoutes from './routes/articles';
import categoryRoutes from './routes/categories';
import commentRoutes from './routes/comments';
import interactionRoutes from './routes/interactions';
import messageRoutes from './routes/messages';
import notificationRoutes from './routes/notifications';
import searchRoutes from './routes/search';
import uploadRoutes from './routes/upload';
import checkinRoutes from './routes/checkin';
import feedbackRoutes from './routes/feedback';
import configRoutes from './routes/config';
import shareRoutes from './routes/share';
import topicRoutes from './routes/topics';
import reportRoutes from './routes/reports';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.app.corsOrigin }));
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const api = config.app.apiPrefix;
app.use(api, apiLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(`${api}/auth`, authRoutes);
app.use(`${api}/users`, userRoutes);
app.use(`${api}/articles`, articleRoutes);
app.use(`${api}/categories`, categoryRoutes);
app.use(`${api}/comments`, commentRoutes);
app.use(`${api}/interactions`, interactionRoutes);
app.use(`${api}/messages`, messageRoutes);
app.use(`${api}/notifications`, notificationRoutes);
app.use(`${api}/search`, searchRoutes);
app.use(`${api}/upload`, uploadRoutes);
app.use(`${api}/checkin`, checkinRoutes);
app.use(`${api}/feedback`, feedbackRoutes);
app.use(`${api}/config`, configRoutes);
app.use(`${api}/share`, shareRoutes);
app.use(`${api}/topics`, topicRoutes);
app.use(`${api}/reports`, reportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
