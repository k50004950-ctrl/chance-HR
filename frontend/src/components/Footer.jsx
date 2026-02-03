import React from 'react';
import { Link } from 'react-router-dom';

const Footer = ({ simple = false }) => {
  if (simple) {
    // 로그인/회원가입 페이지용 간단한 푸터
    return (
      <div style={{
        marginTop: '40px',
        padding: '20px',
        borderTop: '1px solid #e0e0e0',
        textAlign: 'center',
        fontSize: '12px',
        color: '#666',
        backgroundColor: '#f9f9f9'
      }}>
        <div style={{ marginBottom: '8px', fontWeight: '600', color: '#333' }}>
          찬스컴퍼니
        </div>
        <div style={{ marginBottom: '4px' }}>
          사업자등록번호: 819-06-01671 | 대표자: 김우연
        </div>
        <div style={{ marginBottom: '8px' }}>
          이메일: K50004950@gmail.com
        </div>
        <div style={{ color: '#999', fontSize: '11px' }}>
          © 2020-{new Date().getFullYear()} 찬스컴퍼니. All rights reserved.
        </div>
      </div>
    );
  }

  // 대시보드용 상세 푸터
  return (
    <footer style={{
      marginTop: 'auto',
      padding: '30px 20px',
      borderTop: '1px solid #e0e0e0',
      backgroundColor: '#f9f9f9',
      fontSize: '13px',
      color: '#666'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 회사 정보 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '700', 
            color: '#333', 
            marginBottom: '12px' 
          }}>
            찬스컴퍼니
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
            <span>사업자등록번호: 819-06-01671</span>
            <span>|</span>
            <span>대표자: 김우연</span>
            <span>|</span>
            <span>설립: 2020년</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <span>이메일: K50004950@gmail.com</span>
          </div>
        </div>

        {/* 링크 섹션 */}
        <div style={{ 
          marginBottom: '20px', 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}>
          <Link 
            to="/privacy-policy"
            style={{ 
              color: '#667eea', 
              textDecoration: 'none',
              fontSize: '13px'
            }}
            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
          >
            개인정보처리방침
          </Link>
          <span style={{ color: '#ddd' }}>|</span>
          <Link 
            to="/system-guide"
            style={{ 
              color: '#667eea', 
              textDecoration: 'none',
              fontSize: '13px'
            }}
            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
          >
            이용가이드
          </Link>
        </div>

        {/* 저작권 */}
        <div style={{ 
          color: '#999', 
          fontSize: '12px',
          paddingTop: '15px',
          borderTop: '1px solid #e0e0e0'
        }}>
          © 2020-{new Date().getFullYear()} 찬스컴퍼니. All rights reserved.
        </div>

        {/* 모바일 최적화 */}
        <style>
          {`
            @media (max-width: 768px) {
              footer {
                font-size: 12px !important;
              }
              footer > div > div:first-child {
                font-size: 14px !important;
              }
            }
          `}
        </style>
      </div>
    </footer>
  );
};

export default Footer;
