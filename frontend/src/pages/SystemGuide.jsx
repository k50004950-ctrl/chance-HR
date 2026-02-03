import React from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

const SystemGuide = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f7fa' }}>
      {/* 헤더 */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '16px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '8px 16px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            ← 뒤로가기
          </button>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#333' }}>
            시스템 이용 가이드
          </h1>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, padding: '40px 20px' }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #667eea' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#333', marginBottom: '8px' }}>
              급여관리 시스템 이용 가이드
            </h1>
            <p style={{ fontSize: '14px', color: '#666' }}>
              찬스컴퍼니 근태 및 급여관리 시스템
            </p>
          </div>

          <div style={{ lineHeight: '1.8', color: '#333' }}>
            
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginTop: '32px', marginBottom: '16px' }}>
              📌 시스템 개요
            </h2>
            <p style={{ marginBottom: '16px' }}>
              본 시스템은 사업주와 근로자가 각각 회원가입하여 매칭을 통해 연결되며, 출퇴근 관리, 급여 계산, 급여명세서 발급 등을 지원합니다.
            </p>

            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginTop: '32px', marginBottom: '16px' }}>
              👔 사업주 가이드
            </h2>
            
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              1. 회원가입
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li>로그인 페이지에서 <strong>"사업주 회원가입"</strong> 버튼 클릭</li>
              <li>필수 정보 입력: 아이디, 비밀번호, 이름, 연락처, 사업자등록번호</li>
              <li>회원가입 완료 후 자동으로 회사(Company)와 사업장(Workplace)이 생성됩니다</li>
            </ul>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              2. 사업장 등록
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li>대시보드에서 사업장 정보를 입력합니다</li>
              <li><strong>주소 검색:</strong> Daum 우편번호 서비스를 통해 정확한 주소 입력</li>
              <li><strong>위치 설정:</strong> 지도에서 마커를 드래그하여 정확한 위치(위도/경도) 설정</li>
              <li><strong>출퇴근 반경:</strong> 근로자가 출퇴근 체크할 수 있는 반경 설정 (예: 100m)</li>
            </ul>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              3. 근로자 매칭 승인
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li><strong>"🔔 매칭 승인"</strong> 탭에서 근로자의 매칭 요청 확인</li>
              <li>근로자의 기본 정보(이름, 연락처, 주민번호 등) 확인</li>
              <li><strong>"승인"</strong> 버튼을 클릭하여 매칭 완료</li>
              <li>승인 후 근로자 정보가 자동으로 "직원 관리"에 추가됩니다</li>
            </ul>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              4. 직원 정보 설정
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li><strong>"직원 관리"</strong> 탭에서 직원 정보 수정</li>
              <li><strong>급여 정보:</strong> 월급제/시급제 선택, 금액 입력</li>
              <li><strong>근무 정보:</strong> 입사일, 고용형태, 직급, 근무요일, 출퇴근 시간</li>
              <li><strong>4대보험:</strong> 가입 여부 설정</li>
              <li><strong>은행 정보:</strong> 계좌번호는 근로자가 입력한 정보 확인</li>
            </ul>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              5. 급여 계산 및 배포
            </h3>
            <div style={{ 
              backgroundColor: '#f0fdf4', 
              padding: '16px', 
              borderRadius: '8px',
              border: '1px solid #86efac',
              marginBottom: '16px'
            }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: '600' }}>급여 처리 3단계:</p>
              <ol style={{ marginLeft: '20px', marginBottom: '0' }}>
                <li><strong>Step 1 - 출근부 확인:</strong> 근로자별 출퇴근 기록 확인</li>
                <li><strong>Step 2 - 급여 계산:</strong> 자동 계산된 급여 확인 및 수정</li>
                <li><strong>Step 3 - 급여 확정 및 배포:</strong> 급여명세서 생성 및 직원에게 배포</li>
              </ol>
            </div>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li>급여는 기본급, 주휴수당, 4대보험, 소득세 등이 자동 계산됩니다</li>
              <li>Step 3에서 <strong>"급여 확정 및 배포"</strong> 버튼 클릭 시 근로자에게 급여명세서가 표시됩니다</li>
            </ul>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              6. QR 코드 출력
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li><strong>"QR 코드"</strong> 탭에서 사업장별 QR 코드 생성</li>
              <li>QR 코드를 출력하여 사업장 입구에 부착</li>
              <li>근로자는 QR 코드를 스캔하여 빠르게 출퇴근 체크 가능</li>
            </ul>

            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginTop: '32px', marginBottom: '16px' }}>
              👷 근로자 가이드
            </h2>
            
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              1. 회원가입
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li>로그인 페이지에서 <strong>"근로자 회원가입"</strong> 버튼 클릭</li>
              <li>필수 정보 입력: 아이디, 비밀번호, 이름, 연락처, 주민등록번호, 이메일, 주소</li>
              <li><strong>은행 정보:</strong> 급여 수령용 계좌정보 입력</li>
            </ul>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              2. 회사 찾기 및 매칭 요청
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li>로그인 후 대시보드에서 <strong>"🏢 회사 찾기"</strong> 버튼 클릭</li>
              <li>사업주의 <strong>사업자등록번호</strong>와 <strong>전화번호</strong> 입력</li>
              <li>회사 정보 확인 후 <strong>"매칭 요청"</strong> 클릭</li>
              <li>사업주가 승인할 때까지 대기</li>
            </ul>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              3. 개인정보 동의
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li>매칭 승인 후 최초 1회 <strong>개인정보 수집 및 위치정보 이용 동의</strong> 팝업이 표시됩니다</li>
              <li>"동의" 버튼을 클릭하면 이후 다시 표시되지 않습니다</li>
            </ul>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              4. 출퇴근 체크
            </h3>
            <div style={{ 
              backgroundColor: '#fef3c7', 
              padding: '16px', 
              borderRadius: '8px',
              border: '1px solid #fbbf24',
              marginBottom: '16px'
            }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: '600' }}>출퇴근 체크 방법 (3가지):</p>
              <ol style={{ marginLeft: '20px', marginBottom: '0' }}>
                <li><strong>위치 기반:</strong> 사업장 반경 내에서 "출근/퇴근" 버튼 클릭</li>
                <li><strong>QR 코드:</strong> 사업장에 부착된 QR 코드 스캔</li>
                <li><strong>수동:</strong> 위치와 관계없이 수동으로 체크 (사업주 승인 필요)</li>
              </ol>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              5. 급여명세서 확인
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li><strong>"📄 급여명세서"</strong> 탭에서 월별 급여명세서 확인</li>
              <li>사업주가 배포한 급여명세서만 표시됩니다</li>
              <li>기본급, 수당, 공제액, 실수령액 등 상세 내역 확인 가능</li>
              <li>이미지로 저장하여 보관 가능</li>
            </ul>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              6. 사업주 정보 확인
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li><strong>"🏢 사업주"</strong> 탭에서 현재 고용주 정보 확인</li>
              <li>회사명, 사업자등록번호, 주소, 입사일, 직급 등 확인</li>
              <li>과거 고용 이력도 함께 표시됩니다</li>
            </ul>

            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginTop: '32px', marginBottom: '16px' }}>
              📱 모바일 이용
            </h2>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li>모든 기능이 모바일에 최적화되어 있습니다</li>
              <li>스마트폰 브라우저(크롬, 사파리 등)에서 접속 가능</li>
              <li><strong>PWA(Progressive Web App):</strong> 홈 화면에 추가하여 앱처럼 사용 가능</li>
              <li>GPS, 카메라(QR 스캔) 권한 허용 필요</li>
            </ul>

            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginTop: '32px', marginBottom: '16px' }}>
              🔧 문제 해결 (FAQ)
            </h2>
            
            <div style={{ 
              backgroundColor: '#fef2f2', 
              padding: '16px', 
              borderRadius: '8px',
              border: '1px solid #fca5a5',
              marginBottom: '16px'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Q. 회사 검색이 안 돼요</p>
              <p style={{ margin: '0', fontSize: '14px' }}>
                A. 사업자등록번호는 하이픈(-) 없이 숫자만 입력하세요. 전화번호는 사업주가 회원가입 시 등록한 번호와 정확히 일치해야 합니다.
              </p>
            </div>

            <div style={{ 
              backgroundColor: '#fef2f2', 
              padding: '16px', 
              borderRadius: '8px',
              border: '1px solid #fca5a5',
              marginBottom: '16px'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Q. 위치 기반 출퇴근이 안 돼요</p>
              <p style={{ margin: '0', fontSize: '14px' }}>
                A. 브라우저 설정에서 위치 권한을 허용했는지 확인하세요. 사업장 반경 밖에 있다면 QR 코드나 수동 체크를 이용하세요.
              </p>
            </div>

            <div style={{ 
              backgroundColor: '#fef2f2', 
              padding: '16px', 
              borderRadius: '8px',
              border: '1px solid #fca5a5',
              marginBottom: '16px'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Q. 급여명세서가 안 보여요</p>
              <p style={{ margin: '0', fontSize: '14px' }}>
                A. 사업주가 급여를 확정하고 배포해야 근로자에게 표시됩니다. 사업주에게 문의하세요.
              </p>
            </div>

            <div style={{ 
              backgroundColor: '#fef2f2', 
              padding: '16px', 
              borderRadius: '8px',
              border: '1px solid #fca5a5',
              marginBottom: '16px'
            }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Q. 개인정보 동의 팝업이 계속 떠요</p>
              <p style={{ margin: '0', fontSize: '14px' }}>
                A. 브라우저 쿠키/캐시를 삭제하지 말고, "동의" 버튼을 확실히 클릭했는지 확인하세요. 문제가 지속되면 관리자에게 문의하세요.
              </p>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginTop: '32px', marginBottom: '16px' }}>
              📞 고객 지원
            </h2>
            <div style={{ 
              backgroundColor: '#f0f4ff', 
              padding: '20px', 
              borderRadius: '8px',
              border: '1px solid #667eea',
              marginBottom: '16px'
            }}>
              <p style={{ margin: '4px 0' }}><strong>찬스컴퍼니</strong></p>
              <p style={{ margin: '4px 0' }}>사업자등록번호: 819-06-01671</p>
              <p style={{ margin: '4px 0' }}>대표: 김우연</p>
              <p style={{ margin: '4px 0' }}>이메일: K50004950@gmail.com</p>
              <p style={{ margin: '12px 0 0 0', fontSize: '14px', color: '#666' }}>
                문의사항이 있으시면 이메일로 연락주세요.
              </p>
            </div>

          </div>
        </div>
      </div>

      <Footer simple={true} />

      {/* 모바일 최적화 스타일 */}
      <style>{`
        @media (max-width: 768px) {
          h1 {
            font-size: 24px !important;
          }
          h2 {
            font-size: 18px !important;
          }
          h3 {
            font-size: 15px !important;
          }
          div[style*="padding: 40px"] {
            padding: 20px !important;
          }
          div[style*="maxWidth: 900px"] {
            padding: 24px !important;
          }
          ul, ol {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default SystemGuide;
