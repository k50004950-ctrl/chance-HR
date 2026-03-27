import jwt from 'jsonwebtoken';
import type { Response, NextFunction } from 'express';
import { JWT_SECRET_SAFE as JWT_SECRET } from '../config/constants.js';
import type { AuthRequest, UserRole, User } from '../types/index.js';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: '인증 토큰이 필요합니다.' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as User;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
};

// Alias for consistency (some routes use authenticateToken)
export const authenticateToken = authenticate;

export const authorizeRole = (roles: UserRole | UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: '인증이 필요합니다.' });
      return;
    }

    // roles가 배열이 아니면 배열로 변환
    const allowedRoles: UserRole[] = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: '권한이 없습니다.' });
      return;
    }

    next();
  };
};

// Helper function for single role requirement
export const requireRole = (role: UserRole) => {
  return authorizeRole(role);
};
