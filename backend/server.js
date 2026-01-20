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
import authRoutes from './routes/auth.js';
import workplaceRoutes from './routes/workplaces.js';
import employeeRoutes from './routes/employees.js';
import attendanceRoutes from './routes/attendance.js';
import salaryRoutes from './routes/salary.js';
import seedRoutes from './routes/seed.js';
import pastEmployeesRoutes from './routes/pastEmployees.js';
import salaryHistoryRoutes from './routes/salaryHistory.js';
import pastPayrollRoutes from './routes/pastPayroll.js';
import pushRoutes from './routes/push.js';
import { startPaydayScheduler } from './services/payrollSchedule.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// CORS 설정
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// uploads 폴더 생성
const uploadsDir = join(__dirname, 'uploads');
if (!existsSync(uploadsDir)) {
  await mkdir(uploadsDir, { recursive: true });
}

// 정적 파일 제공 (업로드된 파일)
app.use('/uploads', express.static(uploadsDir));

// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/workplaces', workplaceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/past-employees', pastEmployeesRoutes);
app.use('/api/salary-history', salaryHistoryRoutes);
app.use('/api/past-payroll', pastPayrollRoutes);
app.use('/api/push', pushRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: '출퇴근 관리 시스템 API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      workplaces: '/api/workplaces',
      employees: '/api/employees',
      attendance: '/api/attendance',
      salary: '/api/salary'
    }
  });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({ message: '요청한 리소스를 찾을 수 없습니다.' });
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
  } catch (error) {
    console.error('서버 시작 오류:', error);
    process.exit(1);
  }
};

startServer();
