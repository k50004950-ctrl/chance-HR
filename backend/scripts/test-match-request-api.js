import axios from 'axios';

const API_URL = 'https://charming-creation-production.up.railway.app';

async function testMatchRequest() {
  console.log('🧪 매칭 요청 API 테스트 시작...\n');

  try {
    const requestData = {
      userId: 76,  // 이지혜짱 (근로자)
      companyId: 1,  // 본사
      startDate: '2026-01-30',
      position: '주방보조, 서빙',
      employmentType: 'parttime',  // 시간제
      taxType: '3.3% 원천징수',
      monthlySalary: 0,
      hourlyRate: 10000
    };

    console.log('📨 요청 데이터:');
    console.log(JSON.stringify(requestData, null, 2));
    console.log('');

    const response = await axios.post(
      `${API_URL}/api/v2/auth/employee/match-request`,
      requestData
    );

    console.log('✅ 응답 성공!');
    console.log('📋 응답 데이터:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n✅ 매칭 요청 성공!');
      console.log(`   - 메시지: ${response.data.message}`);
      console.log(`   - relationId: ${response.data.relationId}`);
    } else {
      console.log('\n❌ 매칭 요청 실패!');
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

testMatchRequest();
