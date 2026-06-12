import jwt from 'jsonwebtoken';
import { JWT_SECRET_SAFE as JWT_SECRET } from '../config/constants.js';
import { get } from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // 토큰 무효화(revocation) 검사: 토큰의 token_version이 DB와 다르면 폐기된 토큰.
    // tv 클레임이 없는 구버전 토큰은 만료(최대 7일)까지 허용(grandfather).
    if (decoded.tv !== undefined && decoded.id) {
      try {
        const user = await get('SELECT token_version FROM users WHERE id = ?', [decoded.id]);
        if (user && (user.token_version || 0) !== decoded.tv) {
          return res.status(401).json({ message: '세션이 만료되었습니다. 다시 로그인해주세요.', code: 'TOKEN_REVOKED' });
        }
      } catch (dbError) {
        // DB 조회 실패 시: 암호학적으로 유효한 토큰은 통과시킨다(대량 로그아웃 방지).
        console.error('token_version 확인 오류:', dbError.message);
      }
    }

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
