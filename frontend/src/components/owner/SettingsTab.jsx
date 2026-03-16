import React from 'react';
import MapPicker from '../MapPicker';

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
  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0, color: '#374151' }}>🏢 사업장 주소/위치 수정</h3>
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
                🗺️ 지도에서 정확한 위치 설정
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
        <h3 style={{ marginTop: 0, color: '#374151' }}>🔔 출퇴근 알림 설정</h3>
        <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
          직원이 출근/퇴근하면 브라우저로 무료 알림이 전송됩니다. 알림 허용이 필요합니다.
        </p>
        {!pushSupported && (
          <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>
              ⚠️ 현재 브라우저에서는 웹 푸시를 지원하지 않습니다.
            </p>
          </div>
        )}
        {pushSupported && !pushPublicKeyReady && (
          <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>
              ⚠️ 웹 푸시 키가 설정되지 않았습니다.
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
    </>
  );
};

export default SettingsTab;
