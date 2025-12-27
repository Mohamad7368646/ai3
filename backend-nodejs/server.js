import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import designRoutes from './routes/designs.js';

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Initialize express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Node.js Backend is running',
    timestamp: new Date().toISOString(),
    database: 'Connected to MongoDB'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/designs', designRoutes);

// Root route
app.get('/api', (req, res) => {
  res.json({ 
    message: 'مرحباً بك في استوديو تصميم الأزياء بالذكاء الاصطناعي (Node.js)',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      designs: '/api/designs/*',
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    detail: 'المسار غير موجود' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    detail: err.message || 'خطأ في الخادم',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
const PORT = process.env.PORT || 8002;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Node.js Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📡 API Base: http://localhost:${PORT}/api`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
});

export default app;
