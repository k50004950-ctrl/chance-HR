export function normalizeRecoveryCredential(value) {
  return (value ?? '').toString().replace(/\D/g, '').trim();
}

export function getRecoveryCredentialRequirement(role) {
  if (role === 'owner') {
    return {
      field: 'business_number',
      pattern: /^\d{10}$/,
      invalidMessage: '사업주는 사업자등록번호 10자리를 입력해주세요.',
      missingMessage: '사업자등록번호가 등록되지 않은 계정입니다. 이메일로 찾기를 이용하거나 관리자에게 문의해주세요.',
      mismatchMessage: '사업자등록번호가 일치하지 않습니다.'
    };
  }

  return {
    field: 'ssn_last7',
    pattern: /^\d{7}$/,
    invalidMessage: '근로자는 주민등록번호 뒤 7자리를 입력해주세요.',
    missingMessage: '주민등록번호가 등록되지 않은 계정입니다. 이메일로 찾기를 이용하거나 관리자에게 문의해주세요.',
    mismatchMessage: '주민등록번호 뒤 7자리가 일치하지 않습니다.'
  };
}
