import React, { useEffect, useRef, useState } from 'react';
import { ensureKakaoMapsLoaded } from '../utils/addressSearch';

/**
 * 지도에서 위치를 선택할 수 있는 컴포넌트
 * - 마커를 드래그하여 정확한 위치 선택 가능
 * - 지도 클릭으로 위치 이동 가능
 */
const MapPicker = ({ latitude, longitude, onLocationChange, address }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Kakao Maps 스크립트 로드
  useEffect(() => {
    const loadKakaoMap = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await ensureKakaoMapsLoaded();
        setIsLoading(false);
      } catch (err) {
        console.error('❌ 지도 API 로드 실패:', err);
        setError(err.message || '지도를 불러올 수 없습니다.');
        setIsLoading(false);
      }
    };

    loadKakaoMap();
  }, []);

  // 재시도 함수
  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    
    setTimeout(async () => {
      try {
        await ensureKakaoMapsLoaded();
        setIsLoading(false);
      } catch (err) {
        console.error('❌ 지도 API 로드 재시도 실패:', err);
        setError(err.message || '지도를 불러올 수 없습니다.');
        setIsLoading(false);
      }
    }, 100);
  };

  // 지도 초기화 및 마커 설정
  useEffect(() => {
    if (isLoading || !mapRef.current || !window.kakao || !window.kakao.maps) {
      return;
    }
    if (!latitude || !longitude) {
      return;
    }

    try {
      const kakao = window.kakao;
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      // 지도 생성
      const mapOption = {
        center: new kakao.maps.LatLng(lat, lng),
        level: 3 // 확대 레벨
      };
      const newMap = new kakao.maps.Map(mapRef.current, mapOption);

      // 마커 생성 (드래그 가능)
      const newMarker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(lat, lng),
        draggable: true // 마커를 드래그 가능하게 설정
      });
      newMarker.setMap(newMap);

      // 마커 드래그 종료 이벤트
      kakao.maps.event.addListener(newMarker, 'dragend', function() {
        const position = newMarker.getPosition();
        onLocationChange({
          latitude: position.getLat(),
          longitude: position.getLng()
        });
      });

      // 지도 클릭 이벤트
      kakao.maps.event.addListener(newMap, 'click', function(mouseEvent) {
        const latlng = mouseEvent.latLng;
        newMarker.setPosition(latlng);
        onLocationChange({
          latitude: latlng.getLat(),
          longitude: latlng.getLng()
        });
      });

      setMap(newMap);
      setMarker(newMarker);
    } catch (error) {
      console.error('지도 초기화 오류:', error);
      setError('지도를 초기화할 수 없습니다.');
    }
  }, [isLoading, latitude, longitude]);

  // 좌표 변경 시 마커 이동
  useEffect(() => {
    if (!map || !marker || !latitude || !longitude) return;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const newPosition = new window.kakao.maps.LatLng(lat, lng);
    
    marker.setPosition(newPosition);
    map.setCenter(newPosition);
  }, [latitude, longitude, map, marker]);

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff3cd',
        borderRadius: '8px',
        border: '2px solid #ffc107'
      }}>
        <div style={{ textAlign: 'center', padding: '20px', maxWidth: '500px' }}>
          <div style={{ marginBottom: '10px', fontSize: '36px' }}>⚠️</div>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>
            지도를 불러올 수 없습니다
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
            {error}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '12px' }}>
            <button
              onClick={handleRetry}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🔄 다시 시도
            </button>
          </div>
          <div style={{ fontSize: '13px', color: '#666', padding: '10px', backgroundColor: '#fff', borderRadius: '6px' }}>
            💡 <strong>대안:</strong><br/>
            위도/경도를 직접 입력하거나 "현재 위치로 설정" 버튼을 사용하세요.
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        width: '100%',
        height: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '10px', fontSize: '36px' }}>🗺️</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>지도 로딩 중...</div>
          <div style={{ fontSize: '14px', color: '#666' }}>잠시만 기다려주세요</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        marginBottom: '10px',
        padding: '12px',
        backgroundColor: '#e3f2fd',
        borderRadius: '6px',
        fontSize: '14px',
        border: '1px solid #90caf9'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>💡 사용 방법</div>
        <div>• <strong>마커를 드래그</strong>하여 정확한 위치로 이동하세요</div>
        <div>• 또는 <strong>지도를 클릭</strong>하여 마커를 이동할 수 있습니다</div>
        <div>• 마우스 휠로 지도를 확대/축소할 수 있습니다</div>
      </div>
      
      {address && (
        <div style={{
          marginBottom: '10px',
          padding: '10px',
          backgroundColor: '#fff',
          borderRadius: '6px',
          fontSize: '14px',
          border: '1px solid #ddd'
        }}>
          <strong>📍 주소:</strong> {address}
        </div>
      )}

      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '400px',
          borderRadius: '8px',
          border: '2px solid #4285f4',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      />

      <div style={{
        marginTop: '10px',
        padding: '10px',
        backgroundColor: '#f9f9f9',
        borderRadius: '6px',
        fontSize: '13px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '1px solid #ddd'
      }}>
        <div>
          <strong>현재 좌표:</strong><br/>
          위도 {parseFloat(latitude).toFixed(6)}, 경도 {parseFloat(longitude).toFixed(6)}
        </div>
        <a
          href={`https://www.google.com/maps?q=${latitude},${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '8px 16px',
            backgroundColor: '#4285f4',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 'bold'
          }}
        >
          🗺️ Google Maps에서 확인
        </a>
      </div>
    </div>
  );
};

export default MapPicker;
