
import Global from '@/constants/Global';
import React, { useCallback, useEffect, useRef } from 'react';
import { Alert, StatusBar, View } from 'react-native';
import BottomNavigation from '../components/BottomNavigation';
import GeofenceModal from '../components/GeofenceModal';
import KakaoMap, { KakaoMapHandle } from '../components/KakaoMap';
import MapErrorView from '../components/map/MapErrorView';
import MapFloatingButtons from '../components/map/MapFloatingButtons';
import MapHeader from '../components/map/MapHeader';
import MapLoadingView from '../components/map/MapLoadingView';
import { useMapLogic } from '../hooks/useMapLogic';

const MainPage: React.FC = () => {
  const {
    userRole,
    isLoading,
    locationError,
    currentLocation,
    targetLocation,
    geofences,
    isGeofenceModalVisible,
    setIsGeofenceModalVisible,
    handleGeofenceSave,
    handleGeofenceDelete,
    getCurrentDisplayLocation,
    getLocationFreshnessMessage,
    hasMovedToInitialLocation,
    isTracking, // used for header text
    isWebSocketConnected, // used for header text
  } = useMapLogic();

  const mapRef = useRef<KakaoMapHandle>(null);
  const userLocation = getCurrentDisplayLocation();

  // 초기 위치 1회 이동
  const moveToLocation = useCallback((lat: number, lng: number) => {
    mapRef.current?.moveToLocation(lat, lng);
  }, []);

  useEffect(() => {
    const role = userRole;
    if (!role || hasMovedToInitialLocation.current) return;

    const location = role === 'supporter' ? targetLocation : currentLocation;
    if (location) {
      console.log('📍 MapPage - 초기 위치로 지도 이동 (1회만)');
      moveToLocation(location.latitude, location.longitude);
      hasMovedToInitialLocation.current = true;
    }
  }, [currentLocation, targetLocation, moveToLocation, userRole, hasMovedToInitialLocation]);


  const moveToMyLocation = () => {
    const location = userRole === 'supporter' ? targetLocation : currentLocation;
    if (location) {
      moveToLocation(location.latitude, location.longitude);
    } else {
      Alert.alert('위치 정보 없음', '현재 위치 정보를 가져올 수 없습니다.');
    }
  };

  // --- 상태별 렌더링 ---
  if (isLoading) return <MapLoadingView />;
  if (locationError) return <MapErrorView error={locationError} />;
  if (userRole === null) return <MapLoadingView message="역할 정보를 확인 중입니다..." />;
  if (!userLocation) return <MapLoadingView message="현재 위치를 찾는 중..." />;

  // --- 헤더 텍스트 생성 ---
  const getSupporterDisplayLabel = () => {
    const relation = (Global.TARGET_RELATION || '').trim();
    if (relation) return relation;
    if (Global.TARGET_NUMBER) return Global.TARGET_NUMBER;
    return '이용자';
  };
  const label = getSupporterDisplayLabel();

  const headerText = userRole === 'user'
    ? '내 위치'
    : Global.TARGET_NUMBER ? `${label}의 위치` : '이용자 위치';

  const baseHeaderSubText = userRole === 'user'
    ? (isTracking
      ? `GPS 데이터 수집 중${isWebSocketConnected ? ' • 서버 연결됨' : ' • 서버 연결 안됨'}`
      : 'GPS 미작동 중')
    : (!Global.TARGET_NUMBER
      ? '추적할 이용자를 선택해주세요.'
      : !isWebSocketConnected
        ? `${label}의 위치 정보를 받지 못하고 있습니다.`
        : targetLocation
          ? `${label}의 위치를 지도에 표시하고 있습니다.`
          : `${label}의 위치 데이터를 수신하는 중입니다...`);

  const freshness = getLocationFreshnessMessage();
  const headerSubText = freshness ? `${baseHeaderSubText}\n${freshness}` : baseHeaderSubText;

  return (
    <View className="flex-1 bg-green-50">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      <KakaoMap
        ref={mapRef}
        currentLocation={currentLocation}
        targetLocation={targetLocation}
        geofences={geofences}
        userRole={userRole}
        onGeofenceDelete={handleGeofenceDelete}
      />

      <MapHeader headerText={headerText} headerSubText={headerSubText} />

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <MapFloatingButtons
          onAddGeofence={() => setIsGeofenceModalVisible(true)}
          onMoveToMyLocation={moveToMyLocation}
        />
        <BottomNavigation currentScreen="MapPage" />
      </View>

      <GeofenceModal
        visible={isGeofenceModalVisible}
        onClose={() => setIsGeofenceModalVisible(false)}
        onSave={handleGeofenceSave}
        initialLocation={currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        } : undefined}
      />
    </View>
  );
};

export default MainPage;
