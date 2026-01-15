// 주소 검색 및 좌표 변환 유틸리티

let daumScriptPromise = null;

const ensureDaumPostcodeLoaded = () => {
  if (window.daum && window.daum.Postcode) {
    return Promise.resolve();
  }

  if (daumScriptPromise) {
    return daumScriptPromise;
  }

  daumScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Daum 우편번호 스크립트를 로드할 수 없습니다.'));
    document.head.appendChild(script);
  });

  return daumScriptPromise;
};

// Daum 우편번호 서비스를 사용한 주소 검색
export const searchAddress = async () => {
  await ensureDaumPostcodeLoaded();

  return new Promise((resolve, reject) => {
    if (!window.daum || !window.daum.Postcode) {
      reject(new Error('Daum 우편번호 서비스를 로드할 수 없습니다.'));
      return;
    }

    new window.daum.Postcode({
      oncomplete: function(data) {
        // 도로명 주소 또는 지번 주소 사용
        const fullAddress = data.roadAddress || data.jibunAddress;
        resolve({
          address: fullAddress,
          roadAddress: data.roadAddress,
          jibunAddress: data.jibunAddress,
          zonecode: data.zonecode
        });
      },
      onclose: function(state) {
        if (state === 'COMPLETE_CLOSE') {
          // 정상 완료
        } else {
          reject(new Error('주소 검색이 취소되었습니다.'));
        }
      }
    }).open();
  });
};

// 주소를 좌표(위도, 경도)로 변환 - Kakao REST API 사용
export const getCoordinatesFromAddress = async (address) => {
  try {
    // Kakao REST API 키 없이 사용 가능한 대안: Nominatim (OpenStreetMap)
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&countrycodes=kr&limit=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AttendanceSystem/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('주소를 좌표로 변환할 수 없습니다.');
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        success: true
      };
    } else {
      // Nominatim에서 찾지 못한 경우, 대한민국 중심 좌표로 기본값 설정
      return {
        latitude: 37.5665,
        longitude: 126.9780,
        success: false,
        message: '정확한 좌표를 찾을 수 없어 기본 위치(서울시청)로 설정되었습니다. 수동으로 조정해주세요.'
      };
    }
  } catch (error) {
    console.error('좌표 변환 오류:', error);
    throw error;
  }
};

// 구글 맵 링크로 좌표 확인하기
export const getGoogleMapsLink = (latitude, longitude) => {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
};

// 현재 위치 가져오기 (브라우저 Geolocation API)
export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('이 브라우저는 위치 서비스를 지원하지 않습니다.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let message = '위치를 가져올 수 없습니다.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = '위치 권한이 거부되었습니다.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = '위치 정보를 사용할 수 없습니다.';
            break;
          case error.TIMEOUT:
            message = '위치 요청 시간이 초과되었습니다.';
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  });
};
