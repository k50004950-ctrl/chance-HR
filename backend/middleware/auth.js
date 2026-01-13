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

export const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    next();
  };
};
