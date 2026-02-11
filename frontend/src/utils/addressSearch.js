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

export const ensureKakaoMapsLoaded = () => {
  // 이미 로드되어 있으면 즉시 반환
  if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
    console.log('✅ Kakao Maps 이미 로드됨');
    return Promise.resolve();
  }

  // 이전 Promise가 있고 성공했다면 재사용
  if (kakaoScriptPromise) {
    console.log('🔄 Kakao Maps 로딩 중...');
    return kakaoScriptPromise.catch(() => {
      // 이전에 실패했다면 재시도
      console.log('⚠️ 이전 로딩 실패, 재시도 중...');
      kakaoScriptPromise = null;
      return ensureKakaoMapsLoaded();
    });
  }

  const appKey = import.meta.env.VITE_KAKAO_MAPS_KEY || 'f08c77bfb5eb0bcf42a30ed4982c94f2';
  if (!appKey) {
    console.error('❌ Kakao Maps API 키 없음');
    return Promise.reject(new Error('Kakao Maps API 키가 설정되지 않았습니다.'));
  }

  console.log('🗺️ Kakao Maps 스크립트 로딩 시작...');

  kakaoScriptPromise = new Promise((resolve, reject) => {
    // 기존 스크립트가 있으면 제거
    const existingScript = document.querySelector('script[src*="dapi.kakao.com"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.async = true;
    
    script.onload = () => {
      console.log('✅ Kakao Maps 스크립트 로드 완료');
      
      if (window.kakao && window.kakao.maps) {
        // autoload=false로 수동 초기화
        window.kakao.maps.load(() => {
          if (window.kakao.maps.services) {
            console.log('✅ Kakao Maps 서비스 로드 완료');
            resolve();
          } else {
            console.error('❌ Kakao Maps 서비스 로드 실패');
            reject(new Error('Kakao 지도 서비스를 로드할 수 없습니다.'));
          }
        });
      } else {
        console.error('❌ Kakao Maps 객체 없음');
        reject(new Error('Kakao 지도 서비스를 로드할 수 없습니다.'));
      }
    };
    
    script.onerror = (error) => {
      console.error('❌ Kakao Maps 스크립트 로드 오류:', error);
      reject(new Error('Kakao 지도 스크립트를 로드할 수 없습니다. 네트워크를 확인해주세요.'));
    };
    
    document.head.appendChild(script);
    
    // 타임아웃 설정 (10초)
    setTimeout(() => {
      if (!window.kakao || !window.kakao.maps) {
        console.error('⏱️ Kakao Maps 로딩 타임아웃');
        reject(new Error('Kakao 지도 로딩 시간이 초과되었습니다.'));
      }
    }, 10000);
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

    // 모바일 여부 확인
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    // 모바일용 레이어 생성
    let layer = null;
    if (isMobile) {
      layer = document.createElement('div');
      layer.id = 'daum-postcode-layer';
      layer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        z-index: 10000;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
      `;
      document.body.appendChild(layer);
      document.body.style.overflow = 'hidden';
    }

    const postcodeConfig = {
      oncomplete: async function(data) {
        // 도로명 주소 또는 지번 주소 사용
        const fullAddress = data.roadAddress || data.jibunAddress;
        const buildingName = data.buildingName || '';
        
        // Kakao Maps API로 정확한 좌표 가져오기
        let coordinates = null;
        try {
          await ensureKakaoMapsLoaded();
          if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
            // 1차 시도: 건물명 포함 검색 (가장 정확)
            if (buildingName) {
              const places = new window.kakao.maps.services.Places();
              coordinates = await new Promise((resolveCoords) => {
                const searchQuery = `${fullAddress} ${buildingName}`;
                console.log('🔍 장소 검색:', searchQuery);
                places.keywordSearch(searchQuery, (result, status) => {
                  if (status === window.kakao.maps.services.Status.OK && result && result.length > 0) {
                    console.log('✅ 장소 검색 성공:', result[0]);
                    resolveCoords({
                      latitude: parseFloat(result[0].y),
                      longitude: parseFloat(result[0].x),
                      method: 'places_with_building'
                    });
                  } else {
                    resolveCoords(null);
                  }
                });
              });
            }
            
            // 2차 시도: 도로명 주소로 검색
            if (!coordinates && data.roadAddress) {
              const geocoder = new window.kakao.maps.services.Geocoder();
              coordinates = await new Promise((resolveCoords) => {
                console.log('🔍 도로명 주소 검색:', data.roadAddress);
                geocoder.addressSearch(data.roadAddress, (result, status) => {
                  if (status === window.kakao.maps.services.Status.OK && result && result.length > 0) {
                    console.log('✅ 도로명 주소 검색 성공:', result[0]);
                    resolveCoords({
                      latitude: parseFloat(result[0].y),
                      longitude: parseFloat(result[0].x),
                      method: 'geocoder_road'
                    });
                  } else {
                    resolveCoords(null);
                  }
                });
              });
            }
            
            // 3차 시도: 지번 주소로 검색
            if (!coordinates && data.jibunAddress) {
              const geocoder = new window.kakao.maps.services.Geocoder();
              coordinates = await new Promise((resolveCoords) => {
                console.log('🔍 지번 주소 검색:', data.jibunAddress);
                geocoder.addressSearch(data.jibunAddress, (result, status) => {
                  if (status === window.kakao.maps.services.Status.OK && result && result.length > 0) {
                    console.log('✅ 지번 주소 검색 성공:', result[0]);
                    resolveCoords({
                      latitude: parseFloat(result[0].y),
                      longitude: parseFloat(result[0].x),
                      method: 'geocoder_jibun'
                    });
                  } else {
                    resolveCoords(null);
                  }
                });
              });
            }
          }
        } catch (error) {
          console.error('❌ 좌표 변환 오류:', error);
        }
        
        if (coordinates) {
          console.log(`✅ 최종 좌표 (${coordinates.method}):`, coordinates);
        } else {
          console.warn('⚠️ 좌표를 찾을 수 없습니다. 수동 입력이 필요합니다.');
        }
        
        // 모바일 레이어 제거
        if (isMobile && layer) {
          document.body.removeChild(layer);
          document.body.style.overflow = '';
        }

        resolve({
          address: fullAddress,
          roadAddress: data.roadAddress,
          jibunAddress: data.jibunAddress,
          zonecode: data.zonecode,
          buildingName: buildingName,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
          method: coordinates?.method
        });
      },
      onclose: function(state) {
        // 모바일 레이어 제거
        if (isMobile && layer) {
          document.body.removeChild(layer);
          document.body.style.overflow = '';
        }
        
        if (state === 'COMPLETE_CLOSE') {
          // 정상 완료
        } else {
          reject(new Error('주소 검색이 취소되었습니다.'));
        }
      },
      width: '100%',
      height: '100%'
    };

    const postcodeInstance = new window.daum.Postcode(postcodeConfig);
    
    if (isMobile && layer) {
      // 모바일: 레이어에 임베드
      postcodeInstance.embed(layer);
      
      // 닫기 버튼 추가
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '✕ 닫기';
      closeButton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 10001;
        padding: 12px 20px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
      `;
      closeButton.onclick = () => {
        document.body.removeChild(layer);
        document.body.style.overflow = '';
        reject(new Error('주소 검색이 취소되었습니다.'));
      };
      layer.appendChild(closeButton);
    } else {
      // 데스크톱: 팝업
      postcodeInstance.open();
    }
  });
};

// 주소를 좌표(위도, 경도)로 변환 - Kakao Maps SDK 사용
export const getCoordinatesFromAddress = async (address) => {
  try {
    await ensureKakaoMapsLoaded();
    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      // 1. Places API로 장소 검색 시도 (건물명 등 포함)
      const places = new window.kakao.maps.services.Places();
      const placesResult = await new Promise((resolve) => {
        console.log('🔍 장소 검색:', address);
        places.keywordSearch(address, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK && result && result.length > 0) {
            console.log('✅ 장소 검색 성공:', result[0]);
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
        return placesResult;
      }

      // 2. Geocoder로 주소 검색
      const geocoder = new window.kakao.maps.services.Geocoder();
      const kakaoResult = await new Promise((resolve) => {
        console.log('🔍 주소 검색:', address);
        geocoder.addressSearch(address, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK && result && result.length > 0) {
            console.log('✅ 주소 검색 성공:', result[0]);
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
