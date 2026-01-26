import React from 'react';
import Header from '../components/Header';

/**
 * BaseLayout - 모든 역할이 공유하는 기본 레이아웃
 * 
 * 책임:
 * - Header 표시
 * - children 렌더링
 * 
 * 사용:
 * <BaseLayout user={user}>
 *   <YourContent />
 * </BaseLayout>
 */
const BaseLayout = ({ user, children }) => {
  return (
    <div className="app">
      <Header user={user} />
      <div className="base-layout-content">
        {children}
      </div>
    </div>
  );
};

export default BaseLayout;
