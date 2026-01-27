import axios from 'axios';

// API는 항상 같은 도메인의 /api 경로로 호출
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 요청 인터셉터 - 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 인증 API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  register: (userData) => api.post('/auth/register', userData),
  checkUsername: (username) => api.get('/auth/username-check', { params: { username } }),
  getOwners: () => api.get('/auth/owners'),
  getPendingOwners: () => api.get('/auth/pending-owners'),
  approveOwner: (id, action) => api.post(`/auth/approve-owner/${id}`, { action }),
  toggleOwnerStatus: (id) => api.put(`/auth/owners/${id}/toggle-status`),
  deleteOwner: (id) => api.delete(`/auth/owners/${id}`),
  changePassword: (data) => api.put('/auth/change-password', data),
  resetPassword: (data) => api.put('/auth/reset-password', data),
  createTestWorkers: () => api.post('/auth/create-test-workers')
};

// 사업장 API
export const workplaceAPI = {
  getAll: () => api.get('/workplaces'),
  getMy: () => api.get('/workplaces/my'),
  getById: (id) => api.get(`/workplaces/${id}`),
  create: (data) => api.post('/workplaces', data),
  update: (id, data) => api.put(`/workplaces/${id}`, data),
  delete: (id) => api.delete(`/workplaces/${id}`)
};

// 직원 API
export const employeeAPI = {
  getByWorkplace: (workplaceId) => api.get(`/employees/workplace/${workplaceId}`),
  getById: (id) => api.get(`/employees/${id}`),
  getEmploymentCertificate: (id) => api.get(`/employees/${id}/employment-certificate`),
  updateConsent: (id, data) => api.put(`/employees/${id}/consent`, data),
  create: (data) => {
    // 이미 FormData인 경우 그대로 사용
    if (data instanceof FormData) {
      return api.post('/employees', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    
    // 일반 객체인 경우 FormData로 변환
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return api.post('/employees', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  update: (id, data) => {
    // 이미 FormData인 경우 그대로 사용
    if (data instanceof FormData) {
      return api.put(`/employees/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    
    // 일반 객체인 경우 FormData로 변환
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return api.put(`/employees/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  delete: (id) => api.delete(`/employees/${id}`)
};

// 출퇴근 API
export const attendanceAPI = {
  checkIn: (data) => api.post('/attendance/check-in', data),
  checkOut: (data) => api.post('/attendance/check-out', data),
  generateQr: (data) => api.post('/attendance/qr/generate', data),
  checkQr: (data) => api.post('/attendance/qr/check', data),
  getMy: (params) => api.get('/attendance/my', { params }),
  getToday: () => api.get('/attendance/today'),
  getByEmployee: (employeeId, params) => api.get(`/attendance/employee/${employeeId}`, { params }),
  getByWorkplace: (workplaceId, params) => api.get(`/attendance/workplace/${workplaceId}`, { params }),
  update: (id, data) => api.put(`/attendance/${id}`, data)
};

// 급여 API
export const salaryAPI = {
  calculate: (employeeId, params) => api.get(`/salary/calculate/${employeeId}`, { params }),
  calculateWorkplace: (workplaceId, params) => api.get(`/salary/workplace/${workplaceId}`, { params }),
  getSeverance: (employeeId) => api.get(`/salary/severance/${employeeId}`),
  calculateTax: (basePay, dependentsCount) => api.post('/salary/calculate-tax', { basePay, dependentsCount }),
  calculateInsurance: (basePay, payrollMonth) => api.post('/salary/calculate-insurance', { basePay, payrollMonth }),
  importLedger: (data) => api.post('/salary/ledger/import', data),
  getMySlips: (params) => api.get('/salary/slips/my', { params }),
  getEmployeeSlips: (userId, params) => api.get(`/salary/slips/employee/${userId}`, { params }),
  createSlip: (data) => api.post('/salary/slips', data),
  updateSlip: (id, data) => api.put(`/salary/slips/${id}`, data),
  deleteSlip: (id) => api.delete(`/salary/slips/${id}`),
  publishSlip: (id) => api.put(`/salary/slips/${id}/publish`),
  generateMonthlySlips: (workplaceId, data) => api.post(`/salary/slips/generate/${workplaceId}`, data),
  generateEmployeeHistory: (userId) => api.post(`/salary/slips/generate-history/${userId}`),
  getPayrollLedger: (workplaceId, payrollMonth) => api.get(`/salary/payroll-ledger/${workplaceId}/${payrollMonth}`),
  calculateInsurance: (data) => api.post('/salary/calculate-insurance', data),
  finalize: (data) => api.post('/salary/finalize', data)
};

// 과거 직원 API
export const pastEmployeeAPI = {
  getAll: () => api.get('/past-employees'),
  create: (data) => api.post('/past-employees', data),
  delete: (id) => api.delete(`/past-employees/${id}`)
};

// 과거 급여 기록 API (시스템 도입 전)
export const pastPayrollAPI = {
  getByEmployee: (employeeId) => api.get(`/past-payroll/${employeeId}`),
  create: (employeeId, data) => api.post(`/past-payroll/${employeeId}`, data),
  delete: (employeeId, recordId) => api.delete(`/past-payroll/${employeeId}/${recordId}`)
};

// 웹 푸시 API
export const pushAPI = {
  getPublicKey: () => api.get('/push/public-key'),
  subscribe: (data) => api.post('/push/subscribe', data),
  unsubscribe: (data) => api.post('/push/unsubscribe', data),
  sendTest: () => api.post('/push/test')
};

// 급여 변경 이력 API
export const salaryHistoryAPI = {
  getHistory: (employeeId) => api.get(`/salary-history/${employeeId}`)
};

// 공지사항 API
export const announcementsAPI = {
  create: (data) => api.post('/announcements', data),
  getAll: () => api.get('/announcements/all'),
  getActive: () => api.get('/announcements/active'),
  markAsRead: (id) => api.post(`/announcements/${id}/read`),
  deactivate: (id) => api.put(`/announcements/${id}/deactivate`),
  delete: (id) => api.delete(`/announcements/${id}`)
};

// 보험 요율 API
export const insuranceAPI = {
  getCurrent: () => api.get('/insurance/rates/current'),
  getByYear: (year) => api.get(`/insurance/rates/year/${year}`),
  getAll: () => api.get('/insurance/rates/all'),
  create: (data) => api.post('/insurance/rates', data),
  update: (id, data) => api.put(`/insurance/rates/${id}`, data),
  delete: (id) => api.delete(`/insurance/rates/${id}`)
};

// 요율 관리 API (rates_master)
export const ratesMasterAPI = {
  getByMonth: (yyyymm) => api.get('/rates-master', { params: { yyyymm } }),
  getList: () => api.get('/rates-master/list'),
  save: (data) => api.post('/rates-master', data),
  delete: (yyyymm) => api.delete(`/rates-master/${yyyymm}`)
};

// 커뮤니티 API
export const communityAPI = {
  getPosts: (category) => api.get('/community/posts', { params: category ? { category } : {} }),
  getPost: (id) => api.get(`/community/posts/${id}`),
  createPost: (data) => api.post('/community/posts', data),
  updatePost: (id, data) => api.put(`/community/posts/${id}`, data),
  deletePost: (id) => api.delete(`/community/posts/${id}`)
};

export default api;
