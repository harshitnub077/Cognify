import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import classifyRouter from './routes/classify.js';
import profileRouter from './routes/profile.js';
import signalRouter from './routes/signals.js';
import statsRouter from './routes/stats.js';
import { setupWebSocketServer } from './ws/classifyStream.js';


const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/classify', classifyRouter);
app.use('/profile', profileRouter);
app.use('/signal', signalRouter);
app.use('/stats', statsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`FeedShift backend listening on http://127.0.0.1:${PORT}`);
});

// Phase 7: Real-Time Streaming Pipeline
setupWebSocketServer(server);

// Graceful shutdown
const shutdown = () => {
  console.log('Shutdown signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
