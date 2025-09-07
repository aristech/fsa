import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ----------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ----------------------------------------------------------------------

export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// ----------------------------------------------------------------------

export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string =>
  jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

// ----------------------------------------------------------------------

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    throw new Error('Invalid or expired token');
  }
};

// ----------------------------------------------------------------------

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

// ----------------------------------------------------------------------

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> =>
  bcrypt.compare(password, hashedPassword);
