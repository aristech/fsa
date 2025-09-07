import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/fsa',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // API
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
} as const;
