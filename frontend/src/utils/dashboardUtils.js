/**
 * Dashboard utility functions
 * Extracted from OwnerDashboard.jsx for reuse across components.
 */

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ko-KR');
};

export const formatTime = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
};

export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return `${num.toLocaleString()}원`;
};

export const getSalaryTypeName = (type) => {
  switch (type) {
    case 'hourly': return '시급';
    case 'monthly': return '월급';
    case 'annual': return '연봉';
    default: return type;
  }
};
