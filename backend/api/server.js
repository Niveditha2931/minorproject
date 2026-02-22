// require('dotenv').config();
import express, { json, urlencoded } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import { createServer } from 'http';
import connectDB from './config/db.js';
import wsService from './services/websocket.service.js';
import authRoutes from './routes/auth.routes.js';
import incidentRoutes from './routes/incident.routes.js';
config(); 

const app = express();
const server = createServer(app);

// Initialize WebSocket
wsService.init(server);

// Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(json());
app.use(urlencoded({ extended: true }));

// Database connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Crisis Response API is running');
});

// WebSocket status endpoint
app.get('/api/ws/status', (req, res) => {
  res.json({
    websocket: 'active',
    clients: wsService.getClientCount()
  });
});

// Error handling middleware
// app.use(require('./utils/errorHandler'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
});