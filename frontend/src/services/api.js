import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  getOwners: () => api.get('/auth/owners'),
  getPendingOwners: () => api.get('/auth/pending-owners'),
  approveOwner: (id, action) => api.post(`/auth/approve-owner/${id}`, { action })
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
  create: (data) => {
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
  getMy: (params) => api.get('/attendance/my', { params }),
  getToday: () => api.get('/attendance/today'),
  getByEmployee: (employeeId, params) => api.get(`/attendance/employee/${employeeId}`, { params }),
  getByWorkplace: (workplaceId, params) => api.get(`/attendance/workplace/${workplaceId}`, { params }),
  update: (id, data) => api.put(`/attendance/${id}`, data)
};

// 급여 API
export const salaryAPI = {
  calculate: (employeeId, params) => api.get(`/salary/calculate/${employeeId}`, { params }),
  calculateWorkplace: (workplaceId, params) => api.get(`/salary/workplace/${workplaceId}`, { params })
};

export default api;
