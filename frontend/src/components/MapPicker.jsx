import React, { useEffect, useRef, useState } from 'react';

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
    const loadKakaoMap = () => {
      // 이미 로드되어 있는 경우
      if (window.kakao && window.kakao.maps && window.kakao.maps.Map) {
        console.log('✅ Kakao Maps 이미 로드됨');
        setIsLoading(false);
        return;
      }

      // 이미 스크립트가 추가되어 있는지 확인
      const existingScript = document.querySelector('script[src*="dapi.kakao.com/v2/maps/sdk.js"]');
      if (existingScript) {
        console.log('⏳ Kakao Maps 스크립트 로드 대기 중...');
        // 스크립트는 있지만 아직 로드 안 된 경우, 대기
        let attempts = 0;
        const maxAttempts = 100; // 10초 (100ms * 100)
        const checkInterval = setInterval(() => {
          attempts++;
          if (window.kakao && window.kakao.maps && window.kakao.maps.Map) {
            console.log('✅ Kakao Maps 로드 완료');
            clearInterval(checkInterval);
            setIsLoading(false);
          } else if (attempts >= maxAttempts) {
            console.error('❌ Kakao Maps 로드 타임아웃');
            clearInterval(checkInterval);
            setIsLoading(false);
          }
        }, 100);
        return;
      }

      // 새로 스크립트 추가
      console.log('📦 Kakao Maps 스크립트 추가 중...');
      const script = document.createElement('script');
      const apiKey = import.meta.env.VITE_KAKAO_MAPS_KEY || 'f08c77bfb5eb0bcf42a30ed4982c94f2';
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}`;
      script.async = true;
      script.onload = () => {
        console.log('✅ Kakao Maps 스크립트 로드 완료');
        // autoload=false를 사용하지 않으므로 바로 사용 가능
        if (window.kakao && window.kakao.maps) {
          setIsLoading(false);
        } else {
          console.error('❌ Kakao Maps API 초기화 실패');
          setIsLoading(false);
        }
      };
      script.onerror = (err) => {
        console.error('❌ Kakao Maps 스크립트 로드 실패:', err);
        setError('지도 API 로드에 실패했습니다.');
        setIsLoading(false);
      };
      document.head.appendChild(script);
    };

    loadKakaoMap();
  }, []);

  // 지도 초기화 및 마커 설정
  useEffect(() => {
    if (isLoading || !mapRef.current || !window.kakao || !window.kakao.maps) {
      console.log('⏳ 지도 초기화 대기 중...', { isLoading, hasRef: !!mapRef.current, hasKakao: !!(window.kakao && window.kakao.maps) });
      return;
    }
    if (!latitude || !longitude) {
      console.log('⏳ 좌표 대기 중...', { latitude, longitude });
      return;
    }

    try {
      console.log('🗺️ 지도 초기화 시작...', { latitude, longitude });
      const kakao = window.kakao;
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      // 지도 생성
      const mapOption = {
        center: new kakao.maps.LatLng(lat, lng),
        level: 3 // 확대 레벨
      };
      const newMap = new kakao.maps.Map(mapRef.current, mapOption);
      console.log('✅ 지도 생성 완료');

      // 마커 생성 (드래그 가능)
      const newMarker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(lat, lng),
        draggable: true // 마커를 드래그 가능하게 설정
      });
      newMarker.setMap(newMap);
      console.log('✅ 마커 생성 완료');

      // 마커 드래그 종료 이벤트
      kakao.maps.event.addListener(newMarker, 'dragend', function() {
        const position = newMarker.getPosition();
        console.log('📍 마커 드래그 완료:', position.getLat(), position.getLng());
        onLocationChange({
          latitude: position.getLat(),
          longitude: position.getLng()
        });
      });

      // 지도 클릭 이벤트
      kakao.maps.event.addListener(newMap, 'click', function(mouseEvent) {
        const latlng = mouseEvent.latLng;
        console.log('📍 지도 클릭:', latlng.getLat(), latlng.getLng());
        newMarker.setPosition(latlng);
        onLocationChange({
          latitude: latlng.getLat(),
          longitude: latlng.getLng()
        });
      });

      setMap(newMap);
      setMarker(newMarker);
      console.log('✅ 지도 초기화 완료');
    } catch (error) {
      console.error('❌ 지도 초기화 오류:', error);
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
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ marginBottom: '10px', fontSize: '36px' }}>⚠️</div>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{error}</div>
          <div style={{ fontSize: '14px', color: '#666' }}>위도/경도를 직접 입력하거나 "현재 위치로 설정" 버튼을 사용하세요.</div>
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
