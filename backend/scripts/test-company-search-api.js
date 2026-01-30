import axios from 'axios';

const API_URL = 'https://charming-creation-production.up.railway.app';

async function testCompanySearch() {
  console.log('🧪 회사 검색 API 테스트 시작...\n');

  try {
    const businessNumber = '8190601671'; // 하이픈 제거
    const ownerPhone = '01022556296';

    console.log('📨 요청 파라미터:');
    console.log(`   - business_number: ${businessNumber}`);
    console.log(`   - owner_phone: ${ownerPhone}\n`);

    const url = `${API_URL}/api/v2/auth/companies/search?business_number=${businessNumber}&owner_phone=${ownerPhone}`;
    console.log(`🌐 URL: ${url}\n`);

    const response = await axios.get(url);

    console.log('✅ 응답 성공!');
    console.log('📋 응답 데이터:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n✅ 회사 검색 성공!');
      console.log(`   - 회사명: ${response.data.company.company_name}`);
      console.log(`   - 사업자번호: ${response.data.company.business_number}`);
      console.log(`   - 사업주: ${response.data.company.owner_name}`);
    } else {
      console.log('\n❌ 회사 검색 실패!');
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

testCompanySearch();
