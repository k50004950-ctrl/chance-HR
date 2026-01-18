// 두 지점 간의 거리 계산 (Haversine formula)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // 지구 반지름 (미터)
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // 미터 단위
};

// 위치가 사업장 범위 내에 있는지 확인
export const isWithinWorkplace = (userLat, userLon, workplaceLat, workplaceLon, radius, accuracy = 0) => {
  const userLatNum = Number(userLat);
  const userLonNum = Number(userLon);
  const workplaceLatNum = Number(workplaceLat);
  const workplaceLonNum = Number(workplaceLon);
  const radiusNum = Number(radius);
  const accuracyNum = Number(accuracy) || 0;

  if (
    Number.isNaN(userLatNum) ||
    Number.isNaN(userLonNum) ||
    Number.isNaN(workplaceLatNum) ||
    Number.isNaN(workplaceLonNum) ||
    Number.isNaN(radiusNum)
  ) {
    return false;
  }

  const distance = calculateDistance(userLatNum, userLonNum, workplaceLatNum, workplaceLonNum);
  return distance <= radiusNum + accuracyNum;
};
