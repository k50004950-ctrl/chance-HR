import axios from 'axios';

const API_URL = 'https://charming-creation-production.up.railway.app';

async function createTestEmployee() {
  console.log('🧪 테스트 근로자 계정 생성 중...\n');

  try {
    const employee = {
      username: '김테스트',
      password: 'test123!',
      name: '김테스트',
      phone: '01012341234',
      role: 'employee',
      ssn: '9001011234567',  // 13자리
      email: 'test@example.com',
      address: '서울시 강남구 테헤란로 123'
    };

    console.log('📋 회원가입 데이터:');
    console.log(JSON.stringify(employee, null, 2));
    console.log('');

    const response = await axios.post(`${API_URL}/api/v2/auth/signup`, employee);

    if (response.data.success) {
      console.log('✅ 테스트 계정 생성 성공!');
      console.log('');
      console.log('📋 로그인 정보:');
      console.log(`   - 아이디: ${employee.username}`);
      console.log(`   - 비밀번호: ${employee.password}`);
      console.log(`   - 이름: ${employee.name}`);
      console.log(`   - 주민등록번호: ${employee.ssn}`);
      console.log(`   - 이메일: ${employee.email}`);
      console.log(`   - 주소: ${employee.address}`);
    } else {
      console.log('❌ 회원가입 실패!');
      console.log(`   - 메시지: ${response.data.message}`);
    }

  } catch (error) {
    console.error('❌ 오류 발생!');
    if (error.response) {
      console.error(`   - 상태 코드: ${error.response.status}`);
      console.error(`   - 응답:`, error.response.data);
    } else {
      console.error(`   - 메시지: ${error.message}`);
    }
  }
}

createTestEmployee();
