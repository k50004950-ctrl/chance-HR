import React from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

const PrivacyPolicy = () => {
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
            개인정보 처리방침
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
              개인정보 처리방침
            </h1>
            <p style={{ fontSize: '14px', color: '#666' }}>
              시행일자: 2026년 2월 3일
            </p>
          </div>

          <div style={{ lineHeight: '1.8', color: '#333' }}>
            <p style={{ marginBottom: '24px' }}>
              찬스컴퍼니(이하 '회사')는 근태관리 서비스(이하 '서비스')를 제공함에 있어 「개인정보 보호법」, 「위치정보의 보호 및 이용 등에 관한 법률」 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하기 위해 최선을 다하고 있습니다.
            </p>

            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginTop: '32px', marginBottom: '16px' }}>
              1. 수집하는 개인정보 및 위치정보 항목
            </h2>
            <p style={{ marginBottom: '12px' }}>회사는 정확한 근태관리 및 급여 계산 등을 위해 아래 정보를 수집합니다.</p>
            
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              (1) 개인정보
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li><strong>필수항목:</strong> 성명, 사용자ID, 비밀번호, 연락처(휴대폰번호), 이메일, 주민등록번호(급여 계산용), 은행명, 계좌번호, 예금주명</li>
              <li><strong>선택항목:</strong> 부서명, 직급, 사번, 입사일, 주소</li>
              <li><strong>자동수집정보:</strong> 서비스 이용기록, 접속 로그, IP 주소, 쿠키, 접속 기기 정보</li>
            </ul>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              (2) 위치정보
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li><strong>수집항목:</strong> 출퇴근 기록 시점의 GPS 위치정보(위도, 경도), Wi-Fi 접속 정보 등</li>
              <li><strong>수집목적:</strong> 위치기반 근태 인증 및 부정 출퇴근 방지</li>
            </ul>

            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginTop: '32px', marginBottom: '16px' }}>
              2. 개인정보의 수집 및 이용 목적
            </h2>
            <p style={{ marginBottom: '12px' }}>회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.</p>
            
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              (1) 회원 가입 및 관리
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li>회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증</li>
              <li>회원자격 유지·관리, 서비스 부정이용 방지</li>
              <li>각종 고지·통지, 고충처리</li>
            </ul>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              (2) 근태관리 서비스 제공
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li>출퇴근 시간 기록 및 관리</li>
              <li>위치정보를 활용한 출퇴근 인증 및 부정 수급 방지</li>
              <li>근무시간, 연장근무, 휴일근무 등 근태 데이터 관리</li>
            </ul>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              (3) 인사관리 업무 지원
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li>급여 계산 및 급여명세서 발행</li>
              <li>4대보험 및 세금 계산</li>
              <li>연차, 휴가 관리</li>
              <li>근무 스케줄 관리</li>
            </ul>

            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginTop: '32px', marginBottom: '16px' }}>
              3. 개인위치정보의 처리
            </h2>
            
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              (1) 수집 방법
            </h3>
            <p style={{ marginBottom: '12px' }}>
              이용자가 앱 내에서 <strong>'출근' 또는 '퇴근' 버튼을 누르는 시점에만</strong> 위치정보를 수집합니다.
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li><strong>상시 추적 금지 원칙 준수:</strong> 백그라운드에서 상시적으로 위치를 추적하지 않습니다.</li>
              <li>위치정보 수집 시 이용자에게 명확히 고지하며, 사전 동의를 받습니다.</li>
            </ul>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              (2) 보유 및 이용 기간
            </h3>
            <p style={{ marginBottom: '16px' }}>
              위치기반서비스 이용 목적이 달성된 경우 즉시 파기하거나, 「근로기준법」 등 관련 법령에 따라 <strong>3년간</strong> 보관할 수 있습니다.
            </p>

            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginTop: '32px', marginBottom: '16px' }}>
              4. 개인정보의 보유 및 이용 기간
            </h2>
            <p style={{ marginBottom: '12px' }}>
              회사는 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li><strong>근로계약 유효 기간:</strong> 서비스 이용을 위해 필요한 기간 동안 보유</li>
              <li><strong>근로계약 종료 후:</strong> 「근로기준법」 제42조 등 관련 법령에 따라 <strong>3년간</strong> 보관 후 파기</li>
            </ul>

            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginTop: '32px', marginBottom: '16px' }}>
              5. 개인정보의 안전성 확보 조치
            </h2>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li><strong>관리적 조치:</strong> 개인정보 보호책임자 지정, 정기적 직원 교육</li>
              <li><strong>기술적 조치:</strong> 개인정보 및 비밀번호 암호화, SSL(HTTPS) 보안통신</li>
              <li><strong>물리적 조치:</strong> 서버 접근 통제, 데이터베이스 정기 백업</li>
            </ul>

            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginTop: '32px', marginBottom: '16px' }}>
              6. 정보주체의 권리
            </h2>
            <p style={{ marginBottom: '12px' }}>이용자(정보주체)는 다음과 같은 권리를 행사할 수 있습니다.</p>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li>개인정보 열람 요구</li>
              <li>개인정보 정정·삭제 요구</li>
              <li>개인정보 처리정지 요구</li>
              <li>동의 철회(탈퇴)</li>
              <li>위치정보 수집 거부</li>
            </ul>

            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333', marginTop: '32px', marginBottom: '16px' }}>
              7. 개인정보 보호책임자
            </h2>
            <div style={{ 
              backgroundColor: '#f0f4ff', 
              padding: '20px', 
              borderRadius: '8px',
              border: '1px solid #667eea',
              marginBottom: '16px'
            }}>
              <p style={{ margin: '4px 0' }}><strong>성명:</strong> 김우연 대표</p>
              <p style={{ margin: '4px 0' }}><strong>회사명:</strong> 찬스컴퍼니</p>
              <p style={{ margin: '4px 0' }}><strong>사업자등록번호:</strong> 819-06-01671</p>
              <p style={{ margin: '4px 0' }}><strong>이메일:</strong> K50004950@gmail.com</p>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginTop: '20px', marginBottom: '12px' }}>
              고충처리 기관
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li><strong>개인정보침해신고센터:</strong> (국번없이) 118 / privacy.kisa.or.kr</li>
              <li><strong>대검찰청 사이버범죄수사단:</strong> (국번없이) 1301 / cybercid.spo.go.kr</li>
              <li><strong>경찰청 사이버안전국:</strong> (국번없이) 182 / cyberbureau.police.go.kr</li>
            </ul>

            <div style={{ 
              marginTop: '40px', 
              paddingTop: '20px', 
              borderTop: '1px solid #e0e0e0',
              textAlign: 'center',
              color: '#666',
              fontSize: '14px'
            }}>
              <p><strong>찬스컴퍼니</strong></p>
              <p>사업자등록번호: 819-06-01671 | 대표: 김우연</p>
              <p>이메일: K50004950@gmail.com</p>
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
        }
      `}</style>
    </div>
  );
};

export default PrivacyPolicy;
