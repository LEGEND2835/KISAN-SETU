import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { initDatabase } from './db/index.js';
import { runSeed } from './db/seed.js';
import { initQueueSocket } from './sockets/queueSocket.js';

import authRoutes from './routes/auth.js';
import centresRoutes from './routes/centres.js';
import slotsRoutes from './routes/slots.js';
import queueRoutes from './routes/queue.js';
import procurementRoutes from './routes/procurement.js';
import aiRoutes from './routes/ai.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Socket.IO Server Configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));

// Initialize Sockets
initQueueSocket(io);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'KisanSetu Agricultural Procurement Queue API',
    version: '1.0.0',
    time: new Date().toISOString(),
  });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/centres', centresRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/bookings', slotsRoutes); // Alias for booking endpoints
app.use('/api/queue', queueRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Root fallback
app.get('/', (req, res) => {
  res.send('🌾 KisanSetu SIH 2026 Procurement Slot & Queue Management API is Running.');
});

// Server Initialization
async function startServer() {
  try {
    await initDatabase();
    await runSeed();

    server.listen(PORT, () => {
      console.log(`\n========================================================`);
      console.log(`🚀 KisanSetu SIH 2026 Backend running on port ${PORT}`);
      console.log(`🌐 REST API: http://localhost:${PORT}/api`);
      console.log(`⚡ WebSocket: ws://localhost:${PORT}`);
      console.log(`🌾 Ready to manage Mandi slots and realtime queues!`);
      console.log(`========================================================\n`);
    });
  } catch (error) {
    console.error('Fatal Server Startup Error:', error);
    process.exit(1);
  }
}

startServer();
