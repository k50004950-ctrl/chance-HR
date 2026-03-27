import React from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' }
];

const LanguageSwitcher = ({ style }) => {
  const { i18n } = useTranslation();

  const handleChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <select
      value={i18n.language?.substring(0, 2) || 'ko'}
      onChange={handleChange}
      style={{
        padding: '6px 10px',
        borderRadius: '6px',
        border: '1px solid #d1d5db',
        background: 'white',
        fontSize: '13px',
        cursor: 'pointer',
        outline: 'none',
        color: '#374151',
        ...style
      }}
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.label}
        </option>
      ))}
    </select>
  );
};

export default LanguageSwitcher;
