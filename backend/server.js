import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// 환경 변수 로드
dotenv.config();

// 라우트 임포트
import { initDatabase } from './config/database.js';
import { runAutoMigration } from './config/autoMigrate.js';  // V2 자동 마이그레이션
import authRoutes from './routes/auth.js';
import authV2Routes from './routes/authV2.js';  // 새 인증 시스템
import workplaceRoutes from './routes/workplaces.js';
import employeeRoutes from './routes/employees.js';
import attendanceRoutes from './routes/attendance.js';
import salaryRoutes from './routes/salary.js';
import seedRoutes from './routes/seed.js';
import pastEmployeesRoutes from './routes/pastEmployees.js';
import salaryHistoryRoutes from './routes/salaryHistory.js';
import pastPayrollRoutes from './routes/pastPayroll.js';
import pushRoutes from './routes/push.js';
import announcementsRoutes from './routes/announcements.js';
import insuranceRoutes from './routes/insurance.js';
import communityRoutes from './routes/community.js';
// import adminDevRoutes from './routes/adminDev.js'; // ⚠️ 임시 개발자용 API - 비활성화
import ratesMasterRoutes from './routes/ratesMaster.js';
import smsRoutes from './routes/sms.js';
import emailVerificationRoutes from './routes/email-verification.js';
import accountRecoveryRoutes from './routes/account-recovery.js';
import notificationsRoutes from './routes/notifications.js';
import { startPaydayScheduler } from './services/payrollSchedule.js';
import { startAttendanceScheduler } from './services/attendanceScheduler.js';
import jwt from 'jsonwebtoken';
import { apiLimiter } from './middleware/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Server starting...');
console.log('📍 Entry file: backend/server.js');
console.log('📅 Build timestamp:', new Date().toISOString());

// CORS 설정
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

// CORS 설정 (정적 파일은 제외하고 API만 적용)
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // 같은 도메인의 요청은 허용
      callback(null, true);
    }
  },
  credentials: true
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 요청 로깅 (모든 요청)
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// uploads 폴더 생성
const uploadsDir = join(__dirname, 'uploads');
if (!existsSync(uploadsDir)) {
  await mkdir(uploadsDir, { recursive: true });
}

// ========================================
// ✅ 1) API 라우트 먼저 등록 (최우선!)
// ========================================
console.log('🔧 Registering API routes...');

// 검증용 Ping 엔드포인트 (가장 먼저!)
app.get('/api/_ping', cors(corsOptions), (req, res) => {
  console.log('✅ Ping endpoint hit!');
  res.json({
    ok: true, 
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});
console.log('✅ Registered: /api/_ping');

// 업로드 파일 접근 보안 - JWT 인증 필수
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production-2026';
app.use('/uploads', (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) {
    return res.status(401).json({ message: '파일 접근 권한이 없습니다.' });
  }
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: '유효하지 않은 인증입니다.' });
  }
}, express.static(uploadsDir));

// 전역 API Rate Limiting
app.use('/api/', apiLimiter);

// API 라우트들 (CORS 적용)
app.use('/api/auth', cors(corsOptions), authRoutes);
app.use('/api/v2/auth', cors(corsOptions), authV2Routes);  // 새 인증 시스템 (독립 회원가입)
app.use('/api/workplaces', cors(corsOptions), workplaceRoutes);
app.use('/api/employees', cors(corsOptions), employeeRoutes);
app.use('/api/attendance', cors(corsOptions), attendanceRoutes);
app.use('/api/salary', cors(corsOptions), salaryRoutes);
app.use('/api/seed', cors(corsOptions), seedRoutes);
app.use('/api/past-employees', cors(corsOptions), pastEmployeesRoutes);
app.use('/api/salary-history', cors(corsOptions), salaryHistoryRoutes);
app.use('/api/past-payroll', cors(corsOptions), pastPayrollRoutes);
app.use('/api/push', cors(corsOptions), pushRoutes);
app.use('/api/announcements', cors(corsOptions), announcementsRoutes);
app.use('/api/insurance', cors(corsOptions), insuranceRoutes);
app.use('/api/community', cors(corsOptions), communityRoutes);
// app.use('/api/admin/dev', cors(corsOptions), adminDevRoutes); // 비활성화
app.use('/api/sms', cors(corsOptions), smsRoutes);
app.use('/api/email', cors(corsOptions), emailVerificationRoutes);
app.use('/api/account', cors(corsOptions), accountRecoveryRoutes);
app.use('/api/notifications', cors(corsOptions), notificationsRoutes);

// ratesMaster 라우트 - 상세 로깅
console.log('🔧 Importing ratesMaster routes from:', './routes/ratesMaster.js');
console.log('🔧 ratesMasterRoutes type:', typeof ratesMasterRoutes);
console.log('🔧 ratesMasterRoutes value:', ratesMasterRoutes);

app.use('/api/rates-master', cors(corsOptions), ratesMasterRoutes);
console.log('✅ Registered: /api/rates-master');

// 등록된 라우트 검증
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log('  Route:', middleware.route.path);
  } else if (middleware.name === 'router') {
    console.log('  Router middleware');
  }
});

// ========================================
// ✅ 2) 프론트엔드 정적 파일 서빙
// ========================================
const frontendDistPath = existsSync(join(__dirname, 'dist')) 
  ? join(__dirname, 'dist')
  : join(__dirname, '..', 'frontend', 'dist');

console.log('📁 Frontend dist path:', frontendDistPath);
console.log('📁 Dist exists:', existsSync(frontendDistPath));

if (existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  console.log('✅ Serving frontend static files from:', frontendDistPath);
} else {
  console.warn('⚠️ Frontend dist folder not found:', frontendDistPath);
}

// ========================================
// ✅ 3) SPA Fallback (마지막!)
// ========================================
app.get('*', (req, res) => {
  // API 요청이나 정적 파일 요청은 fallback하지 않음
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || 
      req.path.includes('.js') || req.path.includes('.css') || 
      req.path.includes('.png') || req.path.includes('.jpg') || 
      req.path.includes('.ico') || req.path.includes('.svg') ||
      req.path.includes('.woff') || req.path.includes('.woff2')) {
    console.log(`⏭️  Skipping SPA fallback for: ${req.path}`);
    return res.status(404).send('Not found');
  }
  
  const indexPath = join(frontendDistPath, 'index.html');
  
  if (existsSync(indexPath)) {
    console.log(`📄 SPA fallback: ${req.path} -> index.html`);
    res.sendFile(indexPath);
  } else {
    console.error(`❌ index.html not found at: ${indexPath}`);
    res.status(404).json({ 
      error: 'Not found',
      message: 'Frontend not available',
      path: req.path
    });
  }
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('에러:', err);
  res.status(500).json({
    message: '서버 오류가 발생했습니다.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 서버 시작
const startServer = async () => {
  try {
    // 데이터베이스 초기화
    await initDatabase();
    
    // V2 시스템 자동 마이그레이션 (있으면 스킵)
    await runAutoMigration();
    
    app.listen(PORT, () => {
      console.log(`\n===========================================`);
      console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`📍 http://localhost:${PORT}`);
      console.log(`===========================================\n`);
      console.log(`기본 관리자 계정:`);
      console.log(`  - Username: admin`);
      console.log(`  - Password: admin123`);
      console.log(`===========================================\n`);
    });

    startPaydayScheduler();
    startAttendanceScheduler();
  } catch (error) {
    console.error('서버 시작 오류:', error);
    process.exit(1);
  }
};

startServer();
