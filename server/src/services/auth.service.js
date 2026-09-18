import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export const generateAuthToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
    },
    ENV.JWT_SECRET,
    {
      expiresIn: ENV.JWT_EXPIRES_IN,
    }
  );
};

export const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  obj.isSuperAdmin = obj.role === 'SUPER_ADMIN';
  if (!obj.userId && obj.accountId) {
    obj.userId = obj.accountId;
  }
  if (!obj.accountId && obj.userId) {
    obj.accountId = obj.userId;
  }
  return obj;
};

