// ============================================================
// server.js — Lead Generation Platform API Server
// ============================================================
require('dotenv').config();
const express      = require('express');
const http         = require('http');
const { Server }   = require('socket.io');
const cors         = require('cors');
const helmet       = require('helmet');
const compression  = require('compression');
const rateLimit    = require('express-rate-limit');
const path         = require('path');

const { initDb }         = require('./db/database');
const { logger }         = require('./utils/logger');
const searchRoutes       = require('./routes/search');
const leadsRoutes        = require('./routes/leads');
const exportRoutes       = require('./routes/export');
const campaignRoutes     = require('./routes/campaigns');
const { PipelineWorker } = require('./agents/pipelineWorker');

// ── App bootstrap ─────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', methods: ['GET','POST'] }
});

// ── Middleware ────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true });
app.use('/api/', limiter);

// ── Database init ─────────────────────────────────────────
initDb();

// ── Socket.IO — real-time pipeline events ─────────────────
const activeWorkers = new Map();

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('start_pipeline', async (payload) => {
    const { searchId, category, location, limit, linkedinCreds } = payload;
    logger.info(`Pipeline started for searchId=${searchId}`);

    const worker = new PipelineWorker({ searchId, category, location, limit, linkedinCreds, socket });
    activeWorkers.set(searchId, worker);

    try {
      await worker.run();
    } catch (err) {
      logger.error('Pipeline error:', err);
      socket.emit('pipeline_error', { searchId, message: err.message });
    } finally {
      activeWorkers.delete(searchId);
    }
  });

  socket.on('cancel_pipeline', ({ searchId }) => {
    const worker = activeWorkers.get(searchId);
    if (worker) { worker.cancel(); activeWorkers.delete(searchId); }
  });

  socket.on('disconnect', () => logger.info(`Client disconnected: ${socket.id}`));
});

// ── Routes ────────────────────────────────────────────────
app.use('/api/search',    searchRoutes);
app.use('/api/leads',     leadsRoutes);
app.use('/api/export',    exportRoutes);
app.use('/api/campaigns', campaignRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Error handler ─────────────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => logger.info(`🚀  Server running on http://localhost:${PORT}`));
