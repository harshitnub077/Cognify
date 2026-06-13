import * as dotenv from 'dotenv';
dotenv.config(); // Must be FIRST before any other import that uses env vars

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import contentRoutes from './routes/content.routes';
import dashboardRoutes from './routes/dashboard.routes';
import analyticsRoutes from './routes/analytics.routes';
import coachRoutes from './routes/coach.routes';
import bookmarksRoutes from './routes/bookmarks.routes';
import recommendationsRoutes from './routes/recommendations.routes';
import circlesRoutes from './routes/circles.routes';
import reportsRoutes from './routes/reports.routes';
import achievementsRoutes from './routes/achievements.routes';
import userRoutes from './routes/user.routes';

import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';

// Initialize Sentry conditionally
if (process.env.SENTRY_DSN && process.env.SENTRY_DSN.startsWith('http')) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [],
    tracesSampleRate: 1.0,
  });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Global Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Limit each IP to 2000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Health check
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/circles', circlesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/user', userRoutes);

// Sentry.setupExpressErrorHandler(app);

app.listen(PORT as number, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

