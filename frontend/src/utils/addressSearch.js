// 주소 검색 및 좌표 변환 유틸리티

let daumScriptPromise = null;
let kakaoScriptPromise = null;

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

const ensureKakaoMapsLoaded = () => {
  if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
    return Promise.resolve();
  }

  const appKey = import.meta.env.VITE_KAKAO_MAPS_KEY;
  if (!appKey) {
    return Promise.resolve();
  }

  if (kakaoScriptPromise) {
    return kakaoScriptPromise;
  }

  kakaoScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services`;
    script.async = true;
    script.onload = () => {
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
        resolve();
      } else if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(resolve);
      } else {
        reject(new Error('Kakao 지도 서비스를 로드할 수 없습니다.'));
      }
    };
    script.onerror = () => reject(new Error('Kakao 지도 스크립트를 로드할 수 없습니다.'));
    document.head.appendChild(script);
  });

  return kakaoScriptPromise;
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
      oncomplete: async function(data) {
        // 도로명 주소 또는 지번 주소 사용
        const fullAddress = data.roadAddress || data.jibunAddress;
        
        // Kakao Maps API로 정확한 좌표 가져오기
        let coordinates = null;
        try {
          await ensureKakaoMapsLoaded();
          if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
            const geocoder = new window.kakao.maps.services.Geocoder();
            coordinates = await new Promise((resolveCoords) => {
              geocoder.addressSearch(fullAddress, (result, status) => {
                if (status === window.kakao.maps.services.Status.OK && result && result.length > 0) {
                  resolveCoords({
                    latitude: parseFloat(result[0].y),
                    longitude: parseFloat(result[0].x)
                  });
                } else {
                  resolveCoords(null);
                }
              });
            });
          }
        } catch (error) {
          console.error('좌표 변환 오류:', error);
        }
        
        resolve({
          address: fullAddress,
          roadAddress: data.roadAddress,
          jibunAddress: data.jibunAddress,
          zonecode: data.zonecode,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude
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
    // 1. Kakao REST API로 직접 주소 검색 (가장 정확)
    const kakaoRestKey = import.meta.env.VITE_KAKAO_REST_KEY || 'f08c77bfb5eb0bcf42a30ed4982c94f2';
    
    try {
      // 도로명 주소 우선 검색
      const response = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
        {
          headers: {
            'Authorization': `KakaoAK ${kakaoRestKey}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Kakao REST API 응답:', data);
        
        if (data.documents && data.documents.length > 0) {
          const doc = data.documents[0];
          // road_address가 있으면 우선 사용, 없으면 address 사용
          const coords = doc.road_address || doc.address;
          
          if (coords && coords.x && coords.y) {
            const result = {
              latitude: parseFloat(coords.y),
              longitude: parseFloat(coords.x),
              success: true,
              addressType: doc.road_address ? 'road_address' : 'jibun_address'
            };
            console.log('✅ Kakao REST API로 정확한 좌표 찾음:', result);
            return result;
          }
        }
      }
    } catch (restError) {
      console.warn('⚠️ Kakao REST API 호출 실패, fallback 사용:', restError);
    }

    // 2. Fallback: Kakao Maps SDK 사용
    await ensureKakaoMapsLoaded();
    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      // Places API로 장소 검색 시도
      const places = new window.kakao.maps.services.Places();
      const placesResult = await new Promise((resolve) => {
        places.keywordSearch(address, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK && result && result.length > 0) {
            resolve({
              latitude: parseFloat(result[0].y),
              longitude: parseFloat(result[0].x),
              success: true,
              placeName: result[0].place_name,
              addressName: result[0].address_name,
              roadAddressName: result[0].road_address_name
            });
          } else {
            resolve(null);
          }
        });
      });

      if (placesResult) {
        console.log('✅ Kakao Places API로 좌표 찾음:', placesResult);
        return placesResult;
      }

      // Geocoder로 주소 검색
      const geocoder = new window.kakao.maps.services.Geocoder();
      const kakaoResult = await new Promise((resolve) => {
        geocoder.addressSearch(address, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK && result && result.length > 0) {
            resolve({
              latitude: parseFloat(result[0].y),
              longitude: parseFloat(result[0].x),
              success: true
            });
          } else {
            resolve(null);
          }
        });
      });

      if (kakaoResult) {
        console.log('✅ Kakao Geocoder로 좌표 찾음:', kakaoResult);
        return kakaoResult;
      }
    }

    // Kakao REST API 키 없이 사용 가능한 대안: Nominatim (OpenStreetMap)
    // 상세 주소는 찾기 어려우니 단순화해서 재시도
    const simplifiedAddress = address.split(' ').slice(0, 3).join(' '); // 시/도까지만
    const encodedAddress = encodeURIComponent(simplifiedAddress);
    
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
        success: true,
        message: `주소가 간소화되어 검색되었습니다 (${simplifiedAddress}). 정확한 위치는 "현재 위치로 설정" 버튼을 사용하거나 수동으로 조정해주세요.`
      };
    } else {
      // Nominatim에서 찾지 못한 경우, 대한민국 중심 좌표로 기본값 설정
      return {
        latitude: 37.5665,
        longitude: 126.9780,
        success: false,
        message: '정확한 좌표를 찾을 수 없어 기본 위치(서울시청)로 설정되었습니다. "현재 위치로 설정" 버튼을 사용하거나 수동으로 조정해주세요.'
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
