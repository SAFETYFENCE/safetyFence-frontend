import Global from '@/constants/Global';
import { useFocusEffect } from '@react-navigation/native';
import { MapPin, Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Linking, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomNavigation from '../components/BottomNavigation';
import GeofenceModal from '../components/GeofenceModal';
import KakaoMap, { KakaoMapHandle } from '../components/KakaoMap';
import { useLocation } from '../contexts/LocationContext';
import { geofenceService } from '../services/geofenceService';

interface RealTimeLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed?: number;
  heading?: number;
}

interface UserLocation {
  lat: number;
  lng: number;
  name: string;
  status: string;
}
type UserRole = 'user' | 'supporter' | null;

const MainPage: React.FC = () => {
  const {
    isTracking,
    currentLocation,
    error: locationError,
    isLoading,
    isWebSocketConnected,
    targetLocation,
    geofences,
    loadGeofences,
  } = useLocation();

  const mapRef = useRef<KakaoMapHandle>(null);

  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isGeofenceModalVisible, setIsGeofenceModalVisible] = useState(false);
  const hasMovedToInitialLocation = useRef(false);

  const moveToLocation = useCallback((location: RealTimeLocation) => {
    mapRef.current?.moveToLocation(location.latitude, location.longitude);
  }, []);

  // 역할 설정은 1회만 (로그 중복 방지)
  useEffect(() => {
    const role = Global.USER_ROLE;
    if (role === 'user' || role === 'supporter') {
      setUserRole(role);
      console.log('📍 MapPage - 사용자 역할:', role);
    }
  }, []);

  // 초기 위치로 한 번만 이동
  useEffect(() => {
    const role = userRole;
    if (!role || hasMovedToInitialLocation.current) return;

    // 초기 위치로 한 번만 이동 (이후 자동 이동 안 함)
    const location = role === 'supporter' ? targetLocation : currentLocation;
    if (location) {
      console.log('📍 MapPage - 초기 위치로 지도 이동 (1회만)');
      moveToLocation(location);
      hasMovedToInitialLocation.current = true;
    }
  }, [currentLocation, targetLocation, moveToLocation, userRole]);

  useFocusEffect(
    useCallback(() => {
      if (userRole) {
        loadGeofences();
      }
    }, [userRole, loadGeofences])
  );

  // 주기적 지오펜스 동기화 (30초마다)
  useEffect(() => {
    if (!userRole) return;

    const syncInterval = setInterval(() => {
      console.log('🔄 지오펜스 목록 자동 동기화');
      loadGeofences();
    }, 30000); // 30초

    return () => clearInterval(syncInterval);
  }, [userRole, loadGeofences]);

  // 안드로이드 뒤로가기 버튼 막기 (백그라운드 작동 앱이므로)
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        return true; // true 반환으로 기본 뒤로가기 동작 차단
      });

      return () => backHandler.remove();
    }, [])
  );

  const moveToMyLocation = () => {
    // 역할에 따라 다른 위치로 이동
    const location = userRole === 'supporter'
      ? targetLocation      // 보호자: 사용자 위치로
      : currentLocation;    // 이용자: 자신의 위치로

    if (location) {
      moveToLocation(location);
    } else {
      Alert.alert('위치 정보 없음', '현재 위치 정보를 가져올 수 없습니다.');
    }
  };

  const handleGeofenceSave = async (data: {
    name: string;
    address: string;
    type: 'permanent' | 'temporary';
    startTime?: Date;
    endTime?: Date
  }) => {
    try {
      const apiType = data.type === 'permanent' ? 0 : 1;

      const startTime = data.startTime
        ? `${String(data.startTime.getHours()).padStart(2, '0')}:${String(data.startTime.getMinutes()).padStart(2, '0')}`
        : null;
      const endTime = data.endTime
        ? `${String(data.endTime.getHours()).padStart(2, '0')}:${String(data.endTime.getMinutes()).padStart(2, '0')}`
        : null;

      const targetNumber = userRole === 'supporter' && Global.TARGET_NUMBER
        ? Global.TARGET_NUMBER
        : undefined;

      await geofenceService.create({
        name: data.name,
        address: data.address,
        type: apiType,
        startTime,
        endTime,
      }, targetNumber);

      await loadGeofences();

      Alert.alert('성공', `${data.name} 영역이 추가되었습니다.`);
      console.log('새로운 안전 영역 추가 성공');
    } catch (error) {
      console.error('지오펜스 추가 실패:', error);
      Alert.alert('오류', '안전 영역 추가에 실패했습니다.');
    }
  };

  const handleGeofenceDelete = (geofenceId: number, geofenceName: string) => {
    Alert.alert(
      '지오펜스 삭제',
      `"${geofenceName}" 영역을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const targetNumber = userRole === 'supporter' && Global.TARGET_NUMBER
                ? Global.TARGET_NUMBER
                : undefined;

              await geofenceService.delete({ id: geofenceId }, targetNumber);
              await loadGeofences();

              Alert.alert('성공', '지오펜스가 삭제되었습니다.');
              console.log('지오펜스 삭제 성공:', geofenceId);
            } catch (error) {
              console.error('지오펜스 삭제 실패:', error);
              Alert.alert('오류', '지오펜스 삭제에 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const getCurrentDisplayLocation = (): UserLocation | null => {
    if (userRole === 'supporter' && targetLocation) {
      return {
        lat: targetLocation.latitude,
        lng: targetLocation.longitude,
        name: '이용자',
        status: isWebSocketConnected ? 'tracking' : 'idle',
      };
    }

    if (userRole === 'user' && currentLocation) {
      return {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
        name: '내 위치',
        status: isTracking ? 'tracking' : 'idle',
      };
    }

    return null;
  };

  const userLocation = getCurrentDisplayLocation();

  const getSupporterDisplayLabel = () => {
    const relation = (Global.TARGET_RELATION || '').trim();
    if (relation) {
      return relation;
    }
    if (Global.TARGET_NUMBER) {
      return Global.TARGET_NUMBER;
    }
    return '이용자';
  };

  const supporterDisplayLabel = getSupporterDisplayLabel();

  const formatRelativeTime = (diffMs: number) => {
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) {
      return '방금 전';
    }
    if (diffMinutes < 60) {
      return `약 ${diffMinutes}분 전`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `약 ${diffHours}시간 전`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `약 ${diffDays}일 전`;
  };

  const getLocationFreshnessMessage = (): string | null => {
    const location = userRole === 'supporter' ? targetLocation : currentLocation;
    if (!location?.timestamp) return null;

    const diffMs = Date.now() - location.timestamp;
    if (diffMs < 0) return null;

    if (diffMs < 60000) {
      return userRole === 'supporter'
        ? `${supporterDisplayLabel}의 위치는 방금 전 업데이트되었습니다.`
        : '내 위치는 방금 전 업데이트되었습니다.';
    }

    const relative = formatRelativeTime(diffMs);
    return userRole === 'supporter'
      ? `마지막으로 확인된 ${supporterDisplayLabel}의 위치: ${relative}`
      : `마지막으로 확인된 위치: ${relative}`;
  };

  const locationFreshnessMessage = getLocationFreshnessMessage();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-green-50">
        <Text style={{ fontFamily: 'System' }} className="text-gray-700 text-lg">위치 정보를 불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  if (locationError) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-green-50 p-5">
        <Text style={{ fontFamily: 'System' }} className="text-red-600 text-lg text-center mb-4">오류 발생</Text>
        <Text style={{ fontFamily: 'System' }} className="text-gray-700 text-base text-center">{locationError}</Text>
        {locationError.includes("권한") && (
          <TouchableOpacity
            className="mt-6 bg-green-600 px-6 py-3 rounded-lg"
            onPress={() => Linking.openSettings()}
          >
            <Text style={{ fontFamily: 'System' }} className="text-white font-medium">설정으로 이동</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  if (userRole === null) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-green-50">
        <Text style={{ fontFamily: 'System' }} className="text-gray-700 text-lg">역할 정보를 확인 중입니다...</Text>
      </SafeAreaView>
    );
  }

  if (!userLocation) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-green-50">
        <Text style={{ fontFamily: 'System' }} className="text-gray-700 text-lg">현재 위치를 찾는 중...</Text>
      </SafeAreaView>
    );
  }

  const FloatingButtons: React.FC = () => (
    <View style={styles.fabContainer} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.fab, styles.fabSecondary]}
        onPress={() => setIsGeofenceModalVisible(true)}
        activeOpacity={0.85}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.fab, styles.fabPrimary]}
        onPress={moveToMyLocation}
        activeOpacity={0.85}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MapPin size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const headerText = userRole === 'user'
    ? '내 위치'
    : Global.TARGET_NUMBER
      ? `${supporterDisplayLabel}의 위치`
      : '이용자 위치';
  const baseHeaderSubText = userRole === 'user'
    ? (isTracking
      ? `GPS 데이터 수집 중${isWebSocketConnected ? ' • 서버 연결됨' : ' • 서버 연결 안됨'}`
      : 'GPS 미작동 중')
    : (!Global.TARGET_NUMBER
      ? '추적할 이용자를 선택해주세요.'
      : !isWebSocketConnected
        ? `${supporterDisplayLabel}의 위치 정보를 받지 못하고 있습니다.`
        : targetLocation
          ? `${supporterDisplayLabel}의 위치를 지도에 표시하고 있습니다.`
          : `${supporterDisplayLabel}의 위치 데이터를 수신하는 중입니다...`);

  const headerSubText = locationFreshnessMessage
    ? `${baseHeaderSubText}\n${locationFreshnessMessage}`
    : baseHeaderSubText;

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

      <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0 }} edges={['top']}>
        <View className="p-3">
          <View
            className="border border-green-400 rounded-xl p-3 bg-white/90 shadow-md"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'System' }} className="text-lg font-bold text-green-800 text-center">{headerText}</Text>
              <Text style={{ fontFamily: 'System' }} className="text-sm text-green-600 text-center mt-1">{headerSubText}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <FloatingButtons />
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

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 110 : 130,
    alignItems: 'center',
    zIndex: 50,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  fabPrimary: {
    backgroundColor: '#27f572ff',
  },
  fabSecondary: {
    backgroundColor: '#04faacff',
  },
});
