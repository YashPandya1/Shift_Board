import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import { connectDB } from './config/database.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import swapRoutes from './routes/swapRoutes.js';
import apiRoutes from './routes/index.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later' },
});

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = process.env.FRONTEND_URL;
    if (allowed && origin === allowed) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api', availabilityRoutes);
app.use('/api/shiftswap', swapRoutes);
app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

io.on('connection', (socket) => {
  socket.on('join-organization', (orgId) => {
    socket.join(`org:${orgId}`);
  });

  socket.on('disconnect', () => {});
});

export const emitToOrganization = (ioInstance, orgId, event, data) => {
  ioInstance.to(`org:${orgId}`).emit(event, data);
};

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`ShiftBoard API running on port ${PORT}`);
    console.log('Schedule routes: POST /shifts, DELETE /clear-week');
  });
};

startServer();

export default app;
