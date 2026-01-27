import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production-2026';

export const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
  }
};

// Alias for consistency (some routes use authenticateToken)
export const authenticateToken = authenticate;

export const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    // roles가 배열이 아니면 배열로 변환
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    next();
  };
};

// Helper function for single role requirement
export const requireRole = (role) => {
  return authorizeRole(role);
};
