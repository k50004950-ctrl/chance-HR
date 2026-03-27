import React, { useState } from 'react';
import MapPicker from '../MapPicker';
import { accountAPI } from '../../services/api';

/**
 * Settings tab - extracted from OwnerDashboard
 * Props needed:
 * - workplaceLocationForm, handleWorkplaceFormChange, handleSearchWorkplaceAddress
 * - workplaceSearchLoading, handleSetWorkplaceLocation, workplaceLocationLoading
 * - handleSaveWorkplace, workplaceSaving, setWorkplaceLocationForm
 * - pushSupported, pushPublicKeyReady, pushEnabled, pushLoading
 * - handleDisablePush, handleSendPushTest, handleEnablePush
 */
const SettingsTab = ({
  workplaceLocationForm,
  handleWorkplaceFormChange,
  handleSearchWorkplaceAddress,
  workplaceSearchLoading,
  handleSetWorkplaceLocation,
  workplaceLocationLoading,
  handleSaveWorkplace,
  workplaceSaving,
  setWorkplaceLocationForm,
  pushSupported,
  pushPublicKeyReady,
  pushEnabled,
  pushLoading,
  handleDisablePush,
  handleSendPushTest,
  handleEnablePush
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      alert('비밀번호를 입력해주세요.');
      return;
    }
    setDeleteLoading(true);
    try {
      await accountAPI.deleteAccount(deletePassword);
      alert('회원 탈퇴가 완료되었습니다.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } catch (error) {
      const msg = error.response?.data?.message || '탈퇴 처리 중 오류가 발생했습니다.';
      alert(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0, color: '#374151' }}>사업장 주소/위치 수정</h3>
        <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '12px' }}>
          주소 변경 시 위치(위도/경도)를 함께 저장해야 출퇴근 범위가 정확히 적용됩니다.
        </p>
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">사업장명</label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={workplaceLocationForm.name}
              onChange={handleWorkplaceFormChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">주소</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                name="address"
                className="form-input"
                value={workplaceLocationForm.address}
                onClick={handleSearchWorkplaceAddress}
                readOnly
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSearchWorkplaceAddress}
                disabled={workplaceSearchLoading}
                style={{ whiteSpace: 'nowrap' }}
              >
                {workplaceSearchLoading ? '검색 중...' : '주소 검색'}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">위도</label>
            <input
              type="number"
              step="0.000001"
              name="latitude"
              className="form-input"
              value={workplaceLocationForm.latitude}
              onChange={handleWorkplaceFormChange}
            />
          </div>
          <div className="form-group">
            <label className="form-label">경도</label>
            <input
              type="number"
              step="0.000001"
              name="longitude"
              className="form-input"
              value={workplaceLocationForm.longitude}
              onChange={handleWorkplaceFormChange}
            />
          </div>

          {workplaceLocationForm.address && workplaceLocationForm.latitude && workplaceLocationForm.longitude && (
            <div className="form-group">
              <label className="form-label" style={{ marginBottom: '12px', display: 'block', fontSize: '16px', fontWeight: 'bold' }}>
                지도에서 정확한 위치 설정
              </label>
              <MapPicker
                latitude={workplaceLocationForm.latitude}
                longitude={workplaceLocationForm.longitude}
                address={workplaceLocationForm.address}
                onLocationChange={(coords) => {
                  setWorkplaceLocationForm(prev => ({
                    ...prev,
                    latitude: coords.latitude.toFixed(6),
                    longitude: coords.longitude.toFixed(6)
                  }));
                }}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">반경 (미터)</label>
            <input
              type="number"
              name="radius"
              className="form-input"
              value={workplaceLocationForm.radius}
              onChange={handleWorkplaceFormChange}
              placeholder="예: 100"
              min="10"
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSetWorkplaceLocation}
            disabled={workplaceLocationLoading}
          >
            {workplaceLocationLoading ? '위치 불러오는 중...' : '현재 위치로 설정'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveWorkplace}
            disabled={workplaceSaving}
          >
            {workplaceSaving ? '저장 중...' : '사업장 정보 저장'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ marginTop: 0, color: '#374151' }}>출퇴근 알림 설정</h3>
        <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
          직원이 출근/퇴근하면 브라우저로 무료 알림이 전송됩니다. 알림 허용이 필요합니다.
        </p>
        {!pushSupported && (
          <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>
              현재 브라우저에서는 웹 푸시를 지원하지 않습니다.
            </p>
          </div>
        )}
        {pushSupported && !pushPublicKeyReady && (
          <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>
              웹 푸시 키가 설정되지 않았습니다.
            </p>
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {pushEnabled ? (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleDisablePush}
                disabled={pushLoading}
              >
                {pushLoading ? '처리 중...' : '알림 끄기'}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSendPushTest}
                disabled={pushLoading}
              >
                테스트 알림 보내기
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleEnablePush}
              disabled={pushLoading || !pushSupported || !pushPublicKeyReady}
            >
              {pushLoading ? '설정 중...' : '알림 켜기'}
            </button>
          )}
        </div>
      </div>

      {/* 회원 탈퇴 섹션 */}
      <div className="card" style={{ marginTop: '20px', borderColor: '#fecaca' }}>
        <h3 style={{ marginTop: 0, color: '#dc2626' }}>회원 탈퇴</h3>
        <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
          탈퇴 시 개인정보가 삭제되며, 급여/세금 기록은 법적 보관 의무에 따라 5년간 보관 후 자동 삭제됩니다.
        </p>
        <button
          className="btn"
          style={{
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
          onClick={() => setShowDeleteModal(true)}
        >
          회원 탈퇴
        </button>
      </div>

      {/* 탈퇴 확인 모달 */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '12px', padding: '24px',
            maxWidth: '400px', width: '90%'
          }}>
            <h3 style={{ marginTop: 0, color: '#dc2626' }}>회원 탈퇴 확인</h3>
            <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>
              탈퇴 시 개인정보가 삭제되며, 급여/세금 기록은 법적 보관 의무에 따라 5년간 보관 후 자동 삭제됩니다.
            </p>
            <p style={{ fontSize: '14px', color: '#dc2626', fontWeight: 600 }}>
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">비밀번호 확인</label>
              <input
                type="password"
                className="form-input"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }}
                disabled={deleteLoading}
              >
                취소
              </button>
              <button
                className="btn"
                style={{
                  backgroundColor: '#dc2626', color: 'white', border: 'none',
                  padding: '8px 20px', borderRadius: '6px', cursor: 'pointer'
                }}
                onClick={handleDeleteAccount}
                disabled={deleteLoading || !deletePassword}
              >
                {deleteLoading ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsTab;
