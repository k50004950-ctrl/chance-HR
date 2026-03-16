import { body, param, query, validationResult } from 'express-validator';

// Validation result handler middleware
export const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg);
    return res.status(400).json({
      message: messages[0],
      errors: messages
    });
  }
  next();
};

// ============================================
// Auth Validators
// ============================================
export const validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('아이디를 입력해주세요.')
    .isLength({ max: 50 }).withMessage('아이디는 50자 이하여야 합니다.'),
  body('password')
    .notEmpty().withMessage('비밀번호를 입력해주세요.'),
  handleValidation
];

export const validateSignup = [
  body('username')
    .trim()
    .notEmpty().withMessage('아이디를 입력해주세요.')
    .isLength({ min: 3, max: 50 }).withMessage('아이디는 3~50자여야 합니다.')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('아이디는 영문, 숫자, 밑줄(_)만 사용 가능합니다.'),
  body('password')
    .notEmpty().withMessage('비밀번호를 입력해주세요.')
    .isLength({ min: 4 }).withMessage('비밀번호는 최소 4자 이상이어야 합니다.'),
  body('name')
    .trim()
    .notEmpty().withMessage('이름을 입력해주세요.')
    .isLength({ max: 100 }).withMessage('이름은 100자 이하여야 합니다.'),
  body('phone')
    .trim()
    .notEmpty().withMessage('전화번호를 입력해주세요.')
    .matches(/^[0-9\-]+$/).withMessage('전화번호 형식이 올바르지 않습니다.'),
  handleValidation
];

export const validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('현재 비밀번호를 입력해주세요.'),
  body('newPassword')
    .notEmpty().withMessage('새 비밀번호를 입력해주세요.')
    .isLength({ min: 6 }).withMessage('새 비밀번호는 최소 6자 이상이어야 합니다.'),
  handleValidation
];

// ============================================
// Employee Validators
// ============================================
export const validateEmployeeCreate = [
  body('username')
    .trim()
    .notEmpty().withMessage('아이디를 입력해주세요.')
    .isLength({ min: 3, max: 50 }).withMessage('아이디는 3~50자여야 합니다.'),
  body('password')
    .notEmpty().withMessage('비밀번호를 입력해주세요.')
    .isLength({ min: 4 }).withMessage('비밀번호는 최소 4자 이상이어야 합니다.'),
  body('name')
    .trim()
    .notEmpty().withMessage('이름을 입력해주세요.'),
  body('workplace_id')
    .notEmpty().withMessage('사업장을 선택해주세요.')
    .isInt({ min: 1 }).withMessage('유효하지 않은 사업장입니다.'),
  handleValidation
];

// ============================================
// Attendance Validators
// ============================================
export const validateCheckIn = [
  body('workplaceId')
    .notEmpty().withMessage('사업장 정보가 필요합니다.')
    .isInt({ min: 1 }).withMessage('유효하지 않은 사업장입니다.'),
  body('latitude')
    .notEmpty().withMessage('위치 정보가 필요합니다.')
    .isFloat({ min: -90, max: 90 }).withMessage('유효하지 않은 위도입니다.'),
  body('longitude')
    .notEmpty().withMessage('위치 정보가 필요합니다.')
    .isFloat({ min: -180, max: 180 }).withMessage('유효하지 않은 경도입니다.'),
  handleValidation
];

// ============================================
// Salary Validators
// ============================================
export const validateSalaryInfo = [
  body('salary_type')
    .notEmpty().withMessage('급여 유형을 선택해주세요.')
    .isIn(['hourly', 'daily', 'monthly', 'annual']).withMessage('유효하지 않은 급여 유형입니다.'),
  body('amount')
    .notEmpty().withMessage('급여 금액을 입력해주세요.')
    .isFloat({ min: 0 }).withMessage('급여 금액은 0 이상이어야 합니다.'),
  handleValidation
];

// ============================================
// Workplace Validators
// ============================================
export const validateWorkplaceCreate = [
  body('name')
    .trim()
    .notEmpty().withMessage('사업장명을 입력해주세요.')
    .isLength({ max: 255 }).withMessage('사업장명은 255자 이하여야 합니다.'),
  body('address')
    .trim()
    .notEmpty().withMessage('주소를 입력해주세요.'),
  body('latitude')
    .notEmpty().withMessage('위도가 필요합니다.')
    .isFloat({ min: -90, max: 90 }).withMessage('유효하지 않은 위도입니다.'),
  body('longitude')
    .notEmpty().withMessage('경도가 필요합니다.')
    .isFloat({ min: -180, max: 180 }).withMessage('유효하지 않은 경도입니다.'),
  body('radius')
    .optional()
    .isInt({ min: 10, max: 10000 }).withMessage('반경은 10~10,000미터 사이여야 합니다.'),
  handleValidation
];

// ============================================
// Community Validators
// ============================================
export const validateCommunityPost = [
  body('title')
    .trim()
    .notEmpty().withMessage('제목을 입력해주세요.')
    .isLength({ max: 200 }).withMessage('제목은 200자 이하여야 합니다.'),
  body('content')
    .trim()
    .notEmpty().withMessage('내용을 입력해주세요.')
    .isLength({ max: 10000 }).withMessage('내용은 10,000자 이하여야 합니다.'),
  handleValidation
];

// ============================================
// Generic ID Param Validator
// ============================================
export const validateIdParam = [
  param('id')
    .isInt({ min: 1 }).withMessage('유효하지 않은 ID입니다.'),
  handleValidation
];
