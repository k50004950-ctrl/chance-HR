import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = ({ simple = false }) => {
  const { t } = useTranslation();
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
          {t('footer.companyName')}
        </div>
        <div style={{ marginBottom: '4px' }}>
          {t('footer.businessNumber')} | {t('footer.representative')}
        </div>
        <div style={{ marginBottom: '8px' }}>
          {t('footer.email')}
        </div>
        <div style={{ color: '#999', fontSize: '11px' }}>
          &copy; 2020-{new Date().getFullYear()} {t('footer.copyright')}
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
            {t('footer.companyName')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
            <span>{t('footer.businessNumber')}</span>
            <span>|</span>
            <span>{t('footer.representative')}</span>
            <span>|</span>
            <span>Since 2020</span>
          </div>
          <div style={{ marginTop: '8px' }}>
            <span>{t('footer.email')}</span>
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
            {t('footer.privacyPolicy')}
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
            {t('footer.userGuide')}
          </Link>
        </div>

        {/* 저작권 */}
        <div style={{ 
          color: '#999', 
          fontSize: '12px',
          paddingTop: '15px',
          borderTop: '1px solid #e0e0e0'
        }}>
          &copy; 2020-{new Date().getFullYear()} {t('footer.copyright')}
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
