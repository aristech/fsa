import dotenv from 'dotenv';
import { existsSync } from 'fs';

// Load environment variables
console.log('🔍 Loading environment variables...');
console.log('Current working directory:', process.cwd());
console.log('.env file exists:', existsSync('.env'));

// Try to load .env from the backend directory first, then current directory
let dotenvResult = dotenv.config({ path: './apps/backend/.env' });
if (dotenvResult.error) {
  console.log('Apps/backend/.env not found, trying current directory...');
  dotenvResult = dotenv.config();
  if (dotenvResult.error) {
    console.error('❌ No .env file found in any location');
  } else {
    console.log('✅ Environment file loaded from current directory');
  }
} else {
  console.log('✅ Environment file loaded from apps/backend/.env');
}

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

  // File Upload
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  MAX_FILES_PER_REQUEST: parseInt(process.env.MAX_FILES_PER_REQUEST || '10', 10),
} as const;
