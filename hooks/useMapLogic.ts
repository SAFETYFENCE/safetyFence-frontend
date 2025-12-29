
import Global from '@/constants/Global';
import { useLocation } from '@/contexts/LocationContext';
import { geofenceService } from '@/services/geofenceService';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler } from 'react-native';

interface RealTimeLocation {
    latitude: number;
    longitude: number;
}

interface UserLocation {
    lat: number;
    lng: number;
    name: string;
    status: string;
}

type UserRole = 'user' | 'supporter' | null;

export const useMapLogic = () => {
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

    const [userRole, setUserRole] = useState<UserRole>(null);
    const [isGeofenceModalVisible, setIsGeofenceModalVisible] = useState(false);
    const hasMovedToInitialLocation = useRef(false);

    // 역할 설정 (최초 1회)
    useEffect(() => {
        const role = Global.USER_ROLE;
        if (role === 'user' || role === 'supporter') {
            setUserRole(role);
            console.log('📍 MapPage - 사용자 역할:', role);
            // 지오펜스 로드는 useFocusEffect에서 처리
        }
    }, []);

    // 화면 포커스 시 지오펜스 로드 및 안드로이드 백버튼 핸들링
    useFocusEffect(
        useCallback(() => {
            if (userRole) {
                loadGeofences();
            }

            const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
                // 사용자 역할: 뒤로가기 허용 (UI 버튼과 일관성)
                if (userRole === 'user') {
                    return false;  // 뒤로가기 허용
                }
                // 보호자 역할: 계속 막음 (UI에도 버튼 없음)
                return true;  // 뒤로가기 차단
            });

            return () => backHandler.remove();
        }, [userRole]) // loadGeofences는 안정적인 함수이므로 의존성에서 제거
    );

    // 주기적 지오펜스 동기화 (30초)
    useEffect(() => {
        if (!userRole) return;
        const syncInterval = setInterval(() => {
            console.log('🔄 지오펜스 목록 자동 동기화');
            loadGeofences();
        }, 30000);
        return () => clearInterval(syncInterval);
    }, [userRole]); // loadGeofences는 안정적인 함수이므로 의존성에서 제거

    // 지오펜스 저장
    const handleGeofenceSave = async (data: {
        name: string;
        address: string;
        type: 'permanent' | 'temporary';
        startTime?: Date;
        endTime?: Date;
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

    // 지오펜스 삭제
    const handleGeofenceDelete = (geofenceId: number, geofenceName: string) => {
        Alert.alert('지오펜스 삭제', `"${geofenceName}" 영역을 삭제하시겠습니까?`, [
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
        ]);
    };

    // 표시할 현재 위치 계산
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

    // 위치 정보 신선도 메시지
    const getLocationFreshnessMessage = (): string | null => {
        const location = userRole === 'supporter' ? targetLocation : currentLocation;
        if (!location?.timestamp) return null;

        const diffMs = Date.now() - location.timestamp;
        if (diffMs < 0) return null;

        const getSupporterDisplayLabel = () => {
            const relation = (Global.TARGET_RELATION || '').trim();
            if (relation) return relation;
            if (Global.TARGET_NUMBER) return Global.TARGET_NUMBER;
            return '이용자';
        };
        const label = getSupporterDisplayLabel();

        if (diffMs < 60000) {
            return userRole === 'supporter'
                ? `${label}의 위치는 방금 전 업데이트되었습니다.`
                : '내 위치는 방금 전 업데이트되었습니다.';
        }

        const formatRelativeTime = (ms: number) => {
            const diffMinutes = Math.floor(ms / 60000);
            if (diffMinutes < 1) return '방금 전';
            if (diffMinutes < 60) return `약 ${diffMinutes}분 전`;
            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours < 24) return `약 ${diffHours}시간 전`;
            const diffDays = Math.floor(diffHours / 24);
            return `약 ${diffDays}일 전`;
        };

        const relative = formatRelativeTime(diffMs);
        return userRole === 'supporter'
            ? `마지막으로 확인된 ${label}의 위치: ${relative}`
            : `마지막으로 확인된 위치: ${relative}`;
    };

    return {
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
        isTracking,
        isWebSocketConnected,
    };
};
