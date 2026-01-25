/**
 * LocationContext
 * 전역 위치 추적 및 WebSocket 관리
 *
 * 📍 위치 추적 전략:
 * - 포그라운드: watchPositionAsync (2초, 10m) ← 모든 환경에서 작동
 * - 백그라운드: startLocationUpdatesAsync (15초, 10m) + TaskManager ← Dev Build만 작동
 *
 * 📡 위치 전송 전략:
 * - 포그라운드: setInterval (2초 주기) → sendLocationUpdate() → WebSocket/HTTP
 * - 백그라운드: TaskManager 콜백 (15초 주기) → sendLocationUpdate() → WebSocket/HTTP
 *
 * ⚠️ Expo Go 제한사항 (공식 문서):
 * - watchPositionAsync는 포그라운드 전용 API (백그라운드에서 자동 중지됨)
 * - Android/iOS 모두 백그라운드 Task 완전히 불가능
 * - 백그라운드 위치 추적을 위해서는 Development Build 또는 Production Build 필수!
 *
 * 📚 참고: https://docs.expo.dev/versions/latest/sdk/location/
 */

import Global from '@/constants/Global';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Linking, Platform } from 'react-native';
import { startNativeBackgroundLocation, stopNativeBackgroundLocation } from '../services/nativeBackgroundLocation';
import { checkAndRequestBatteryOptimization } from '../utils/batteryOptimization';
import { geofenceService } from '../services/geofenceService';
import { processGeofenceEntries } from '../services/geofenceEntryService';
import { locationService } from '../services/locationService';
import { sendLocationUpdate } from '../services/locationTransport';
import { websocketService } from '../services/websocketService';
import { setupNotificationListeners, cleanupNotificationListeners } from '../services/notificationService';
import { checkGeofenceEntry, calculateDistance } from '../utils/geofenceUtils';
import { storage } from '../utils/storage';
import type { GeofenceItem } from '../types/api';

// 위치 데이터 타입
export interface RealTimeLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed?: number;
  heading?: number;
}

// Context 상태 타입
interface LocationContextState {
  // 위치 추적 상태
  isTracking: boolean;
  currentLocation: RealTimeLocation | null;
  locationHistory: RealTimeLocation[];
  error: string | null;
  isLoading: boolean;

  // WebSocket 상태
  isWebSocketConnected: boolean;

  // 보호자용: 이용자 위치
  targetLocation: RealTimeLocation | null;

  // 지오펜스 상태
  geofences: GeofenceItem[];
  loadGeofences: () => Promise<void>;

  // 일일 이동거리
  dailyDistance: number;        // 누적 거리 (미터) - 로컬 계산
  dailyDistanceKm: number;      // 킬로미터 (소수점 2자리) - 서버 계산
  targetDailyDistanceKm: number; // 보호자용: 선택한 사용자의 이동거리 (킬로미터)
  dailyDistanceLoading: boolean; // 이동거리 로딩 상태

  // 함수
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  connectWebSocket: () => void;
  disconnectWebSocket: () => Promise<void>;
  setSupporterTarget: (targetNumber: string) => void;
  fetchDailyDistance: (targetNumber?: string) => Promise<void>; // 일일 이동거리 새로고침
}

// Context 생성
const LocationContext = createContext<LocationContextState | undefined>(undefined);

// Provider Props
interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<RealTimeLocation | null>(null);
  const [locationHistory, setLocationHistory] = useState<RealTimeLocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [targetLocation, setTargetLocation] = useState<RealTimeLocation | null>(null);
  const [geofences, setGeofences] = useState<GeofenceItem[]>([]);
  const [lastGeofenceCheck, setLastGeofenceCheck] = useState<{ [key: number]: boolean }>({});
  const lastGeofenceCheckRef = useRef<{ [key: number]: boolean }>({});

  // 일일 이동거리 상태
  const [dailyDistance, setDailyDistance] = useState<number>(0);
  const dailyDistanceRef = useRef<number>(0);
  const [dailyDistanceKm, setDailyDistanceKm] = useState<number>(0);
  const [targetDailyDistanceKm, setTargetDailyDistanceKm] = useState<number>(0);
  const [dailyDistanceLoading, setDailyDistanceLoading] = useState<boolean>(false);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const websocketSendInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const supporterTargetRef = useRef<string | null>(null);
  const currentLocationRef = useRef<RealTimeLocation | null>(null);
  const isTrackingRef = useRef<boolean>(false);  // isTracking 상태 동기화용 (stale closure 방지)
  const isTransitioningRef = useRef<boolean>(false);  // AppState 전환 락 (race condition 방지)

  /**
   * 일일 이동거리 업데이트
   */
  const updateDailyDistance = async (newLocation: RealTimeLocation) => {
    // 사용자만 계산
    if (Global.USER_ROLE !== 'user') return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // 오늘 데이터 로드
      let distanceData = await storage.getDailyDistance(today);

      // 새로운 날이면 초기화
      if (!distanceData || distanceData.date !== today) {
        distanceData = {
          distance: 0,
          date: today,
          lastUpdate: newLocation.timestamp,
          lastLatitude: newLocation.latitude,
          lastLongitude: newLocation.longitude,
        };
      }

      // 이전 위치가 있으면 거리 계산
      if (distanceData.lastLatitude && distanceData.lastLongitude) {
        const distance = calculateDistance(
          distanceData.lastLatitude,
          distanceData.lastLongitude,
          newLocation.latitude,
          newLocation.longitude
        );

        // GPS 오류 필터링: 2초에 100m 이상 이동 시 제외
        const timeDiff = (newLocation.timestamp - distanceData.lastUpdate) / 1000;
        const maxDistance = 50 * timeDiff; // 50m/s = 180km/h

        if (distance <= maxDistance && distance < 100) {
          distanceData.distance += distance;
          setDailyDistance(distanceData.distance);
          dailyDistanceRef.current = distanceData.distance;
        } else if (distance >= 100) {
          console.warn(`⚠️ GPS 오류 감지: ${distance.toFixed(1)}m 이동 (${timeDiff.toFixed(1)}초) - 필터링됨`);
        }
      }

      // 마지막 위치 업데이트 및 저장
      distanceData.lastLatitude = newLocation.latitude;
      distanceData.lastLongitude = newLocation.longitude;
      distanceData.lastUpdate = newLocation.timestamp;

      await storage.setDailyDistance(distanceData);
    } catch (error) {
      console.error('❌ 일일 이동거리 업데이트 실패:', error);
    }
  };

  /**
   * 위치 업데이트 공통 처리 함수
   * watchPositionAsync 콜백에서 호출됨
   *
   * ⚠️ 주의: watchPositionAsync는 포그라운드 전용!
   * 백그라운드에서는 이 함수가 호출되지 않습니다.
   */
  const handleLocationUpdate = async (newLocation: Location.LocationObject) => {
    const realTimeLocation: RealTimeLocation = {
      latitude: newLocation.coords.latitude,
      longitude: newLocation.coords.longitude,
      accuracy: newLocation.coords.accuracy || 0,
      timestamp: newLocation.timestamp,
      speed: newLocation.coords.speed || undefined,
      heading: newLocation.coords.heading || undefined,
    };

    // State 업데이트
    setCurrentLocation(realTimeLocation);
    setLocationHistory(prev => [...prev.slice(-19), realTimeLocation]);
    currentLocationRef.current = realTimeLocation;

    console.log('📍 위치 업데이트 (포그라운드):', realTimeLocation);

    // 일일 이동거리 업데이트
    await updateDailyDistance(realTimeLocation);

    // 위치 전송은 별도 setInterval이 담당 (중복 방지)
  };

  /**
   * watchPositionAsync 시작 (재시도 로직 포함)
   * 일시적 GPS 오류 등에서 복구하기 위한 헬퍼 함수
   */
  const startWatchPositionWithRetry = async (maxRetries: number = 3): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 기존 subscription 정리
        if (locationSubscription.current) {
          try {
            locationSubscription.current.remove();
          } catch (e) {
            // 이미 제거된 경우 무시
          }
          locationSubscription.current = null;
        }

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 10,
          },
          handleLocationUpdate
        );

        locationSubscription.current = sub;
        console.log(`✅ watchPositionAsync 시작 성공 (시도 ${attempt}/${maxRetries})`);
        return true;
      } catch (error) {
        console.warn(`⚠️ watchPositionAsync 시작 실패 (시도 ${attempt}/${maxRetries}):`, error);

        if (attempt < maxRetries) {
          // 지수 백오프: 1초, 2초, 4초...
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ ${delay}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('❌ watchPositionAsync 시작 최종 실패');
    return false;
  };

  /**
   * 위치 추적 시작
   */
  const startTracking = async () => {
    try {
      setIsLoading(true);

      if (!Global.NUMBER) {
        const loginRequiredMessage = '로그인 후 위치 추적을 시작할 수 있습니다.';
        console.warn('⚠️ 사용자 번호가 없어 위치 추적을 시작할 수 없음');
        setError(loginRequiredMessage);
        setIsLoading(false);
        return;
      }

      if (isTracking) {
        console.log('ℹ️ 이미 위치 추적 중');
        setIsLoading(false);
        return;
      }

      // 권한 확인 및 요청 (iOS 안전 처리)
      let status: string = 'undetermined';

      try {
        const permissionResult = await Location.getForegroundPermissionsAsync();
        status = permissionResult.status;
        console.log('📍 초기 권한 상태:', status);
      } catch (permError) {
        console.error('📍 권한 확인 실패:', permError);
        // iOS에서 권한 확인 실패 시 바로 요청 시도
      }

      if (status !== 'granted') {
        console.log('📍 권한 요청 중...');
        try {
          const result = await Location.requestForegroundPermissionsAsync();
          status = result.status;
          console.log('📍 권한 요청 결과:', status);
        } catch (reqError) {
          console.error('📍 권한 요청 실패:', reqError);
          setError('위치 권한을 요청할 수 없습니다. 설정에서 직접 권한을 허용해주세요.');
          setIsLoading(false);
          return;
        }
      }

      if (status !== 'granted') {
        setError('지도 표시를 위해 위치 권한이 필요합니다. 설정에서 권한을 허용해주세요.');
        setIsLoading(false);
        return;
      }

      // 백그라운드 권한 확인 (이용자만)
      if (Global.USER_ROLE === 'user') {
        try {
          let { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
          if (backgroundStatus !== 'granted') {
            const requestResult = await Location.requestBackgroundPermissionsAsync();
            backgroundStatus = requestResult.status;
          }

          if (backgroundStatus !== 'granted') {
            Alert.alert(
              '백그라운드 권한 필요',
              '백그라운드에서도 안전하게 위치를 전송하려면 설정에서 "위치 → 항상 허용"으로 변경해 주세요.',
              [
                { text: '나중에', style: 'cancel' },
                { text: '설정 열기', onPress: () => Linking.openSettings() },
              ],
              { cancelable: true }
            );
            console.warn('⚠️ 백그라운드 권한이 없어 포그라운드에서만 위치 전송 가능');
          }
        } catch (bgError) {
          console.warn('⚠️ 백그라운드 권한 요청 실패 (Expo Go 제한):', bgError);
        }
      }

      // 초기 위치 가져오기 (실패해도 계속 진행)
      try {
        const initialLocation = await Location.getLastKnownPositionAsync();
        if (initialLocation) {
          const realTimeLocation: RealTimeLocation = {
            latitude: initialLocation.coords.latitude,
            longitude: initialLocation.coords.longitude,
            accuracy: initialLocation.coords.accuracy || 0,
            timestamp: initialLocation.timestamp,
            speed: initialLocation.coords.speed || undefined,
            heading: initialLocation.coords.heading || undefined,
          };
          setCurrentLocation(realTimeLocation);
          setLocationHistory([realTimeLocation]);
          console.log('📍 초기 위치 설정:', realTimeLocation);
        }
      } catch (lastKnownError) {
        console.warn('📍 마지막 위치 가져오기 실패, 실시간 추적으로 진행:', lastKnownError);
      }

      // 실시간 위치 추적 시작
      console.log('📍 실시간 위치 추적 시작');
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000, // 2초마다 업데이트
          distanceInterval: 10, // 10미터 이동 시 업데이트
        },
        handleLocationUpdate // 공통 핸들러 사용
      );

      locationSubscription.current = subscription;
      setIsTracking(true);
      setError(null);
      setIsLoading(false);

      // 백그라운드 위치/지오펜스 처리
      if (Global.USER_ROLE === 'user') {
        if (Platform.OS === 'android') {
          // ✅ Android: 네이티브 FGS가 위치 전송 + 지오펜스 체크 모두 담당
          try {
            const apiKey = await storage.getApiKey();
            if (apiKey && Global.NUMBER) {
              // 지오펜스 캐시 가져오기
              let geofenceCacheStr: string | undefined;
              try {
                const cache = await storage.getGeofenceCache();
                if (cache) {
                  geofenceCacheStr = JSON.stringify(cache);
                  console.log(`📍 지오펜스 캐시 로드: ${cache.data.length}개`);
                }
              } catch (e) {
                console.warn('⚠️ 지오펜스 캐시 로드 실패:', e);
              }

              await startNativeBackgroundLocation({
                baseUrl: Global.URL,
                apiKey,
                userNumber: Global.NUMBER,
                geofenceCache: geofenceCacheStr,
              });
              console.log('✅ [Android] 네이티브 백그라운드 서비스 시작 (위치 전송 + 지오펜스)');
            } else {
              console.warn('⚠️ 백그라운드 위치 서비스 시작 실패: apiKey/userNumber 없음');
            }
          } catch (error) {
            console.warn('⚠️ 네이티브 백그라운드 위치 서비스 시작 실패:', error);
          }

          // 배터리 최적화 안내 (Android, 최초 1회)
          checkAndRequestBatteryOptimization();
        } else {
          // ✅ iOS: Expo Task로 지오펜스 체크 (네이티브 FGS 없음)
          try {
            const { startBackgroundLocationTracking } = await import('../services/backgroundLocationService');
            const started = await startBackgroundLocationTracking();
            if (started) {
              console.log('✅ [iOS] Expo 백그라운드 Task 등록 완료');
            } else {
              console.warn('⚠️ [iOS] 백그라운드 Task 등록 실패');
            }
          } catch (error) {
            console.warn('⚠️ [iOS] 백그라운드 Task 등록 중 오류:', error);
          }
        }
      }

      console.log('✅ 위치 추적 시작 완료');
    } catch (err) {
      console.error('❌ 위치 추적 시작 실패:', err);
      setError('위치 추적 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  /**
   * 위치 추적 중지
   */
  const stopTracking = async () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
      setIsTracking(false);
      console.log('📍 위치 추적 중지');
    }

    if (Platform.OS === 'android') {
      // Android: 네이티브 FGS 중지
      await stopNativeBackgroundLocation();
      console.log('✅ [Android] 네이티브 FGS 중지');
    } else {
      // iOS: Expo 백그라운드 Task 중지
      try {
        const { stopBackgroundLocationTracking } = await import('../services/backgroundLocationService');
        await stopBackgroundLocationTracking();
        console.log('✅ [iOS] Expo 백그라운드 Task 중지');
      } catch (error) {
        console.warn('⚠️ [iOS] Expo Task 중지 실패:', error);
      }
    }
  };

  const subscribeToSupporterTarget = (targetNumber: string) => {
    websocketService.subscribeToUserLocation(targetNumber, (locationData) => {
      console.log('📍 이용자 위치 업데이트:', locationData);
      setTargetLocation({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: 0,
        timestamp: locationData.timestamp || Date.now(),
      });
    });
  };

  const clearSupporterTarget = () => {
    if (supporterTargetRef.current) {
      websocketService.unsubscribeFromUserLocation(supporterTargetRef.current);
      supporterTargetRef.current = null;
    }
    Global.TARGET_NUMBER = '';
    Global.TARGET_RELATION = '';
    setTargetLocation(null);
  };

  /**
   * WebSocket 연결
   */
  const connectWebSocket = () => {
    if (!Global.NUMBER) {
      console.warn('⚠️ 사용자 번호가 없어 WebSocket 연결 불가');
      return;
    }

    console.log('🔌 WebSocket 연결 시작...');
    websocketService.connect(Global.NUMBER, (connected) => {
      setIsWebSocketConnected(connected);
      if (connected) {
        console.log('✅ WebSocket 연결됨');

        // 보호자인 경우 이용자 위치 구독
        if (Global.USER_ROLE === 'supporter' && supporterTargetRef.current) {
          console.log(`👥 보호자 모드: ${supporterTargetRef.current}의 위치 구독 시작`);
          subscribeToSupporterTarget(supporterTargetRef.current);
        }
      } else {
        console.log('❌ WebSocket 연결 실패');
      }
    });
  };

  /**
   * WebSocket 연결 해제
   */
  const disconnectWebSocket = async () => {
    console.log('🔌 WebSocket 연결 해제');
    clearSupporterTarget();
    await websocketService.disconnect();
    setIsWebSocketConnected(false);
  };

  const setSupporterTarget = (targetNumber: string) => {
    if (Global.USER_ROLE !== 'supporter') {
      console.warn('⚠️ 보호자 역할이 아니어서 이용자 구독을 설정할 수 없음');
      return;
    }
    if (supporterTargetRef.current === targetNumber) {
      return;
    }
    if (supporterTargetRef.current) {
      websocketService.unsubscribeFromUserLocation(supporterTargetRef.current);
    }
    supporterTargetRef.current = targetNumber;
    Global.TARGET_NUMBER = targetNumber;
    setTargetLocation(null);

    // 선택한 이용자의 지오펜스 자동 로드
    loadGeofences();

    if (isWebSocketConnected) {
      console.log(`👥 보호자 모드: ${targetNumber}의 위치 구독 시작`);
      subscribeToSupporterTarget(targetNumber);
    } else {
      connectWebSocket();
    }
  };

  /**
   * 지오펜스 목록 로드
   * - 이용자: 본인의 지오펜스
   * - 보호자: 선택한 이용자의 지오펜스 (Global.TARGET_NUMBER)
   */
  const loadGeofences = useCallback(async () => {
    try {
      let targetNumber: string | undefined;

      if (Global.USER_ROLE === 'user') {
        // 이용자: 본인 지오펜스 (targetNumber = undefined → API에서 Global.NUMBER 사용)
        targetNumber = undefined;
      } else if (Global.USER_ROLE === 'supporter') {
        // 보호자: 선택한 이용자 지오펜스
        if (!Global.TARGET_NUMBER) {
          console.log('ℹ️ 보호자 모드: 이용자를 먼저 선택해주세요');
          setGeofences([]); // 빈 배열로 초기화
          return;
        }
        targetNumber = Global.TARGET_NUMBER;
        console.log(`📍 보호자 모드: ${targetNumber}의 지오펜스 로드`);
      } else {
        console.log('ℹ️ 역할이 설정되지 않았습니다');
        return;
      }

      const data = await geofenceService.getList(targetNumber);
      setGeofences(data);

      // 백그라운드를 위한 캐시 저장 (이용자만)
      if (Global.USER_ROLE === 'user') {
        await storage.setGeofenceCache(data);

        // Android: 네이티브 서비스 캐시도 업데이트
        if (Platform.OS === 'android') {
          try {
            const { updateNativeGeofenceCache } = await import('../services/nativeBackgroundLocation');
            const cacheObj = { data, timestamp: Date.now() };
            await updateNativeGeofenceCache(JSON.stringify(cacheObj));
            console.log('✅ [Android] 네이티브 지오펜스 캐시 업데이트 완료');
          } catch (e) {
            console.warn('⚠️ [Android] 네이티브 지오펜스 캐시 업데이트 실패:', e);
          }
        }
      }

      console.log(`✅ 지오펜스 목록 로드 성공: ${data.length}개 (${Global.USER_ROLE === 'supporter' ? `이용자: ${targetNumber}` : '본인'})`);
    } catch (error) {
      console.error('❌ 지오펜스 목록 로드 실패:', error);
      setGeofences([]); // 에러 시 빈 배열
    }
  }, []);

  /**
   * 일일 이동거리 조회 (서버 API)
   * - 이용자: 본인의 이동거리
   * - 보호자: targetNumber가 있으면 해당 이용자, 없으면 선택된 이용자
   */
  const fetchDailyDistance = useCallback(async (targetNumber?: string) => {
    try {
      setDailyDistanceLoading(true);

      if (Global.USER_ROLE === 'user') {
        // 이용자: 본인 이동거리
        const response = await locationService.getDailyDistance();
        setDailyDistanceKm(response.distanceKm);
        console.log(`📊 일일 이동거리 조회 성공: ${response.distanceKm} km`);
      } else if (Global.USER_ROLE === 'supporter') {
        // 보호자: 선택한 이용자의 이동거리
        const target = targetNumber || Global.TARGET_NUMBER;
        if (!target) {
          console.log('ℹ️ 보호자 모드: 이용자를 먼저 선택해주세요');
          setTargetDailyDistanceKm(0);
          return;
        }
        const response = await locationService.getDailyDistance(target);
        setTargetDailyDistanceKm(response.distanceKm);
        console.log(`📊 이용자(${target}) 일일 이동거리 조회 성공: ${response.distanceKm} km`);
      }
    } catch (error) {
      console.error('❌ 일일 이동거리 조회 실패:', error);
      // 에러 시 0으로 설정
      if (Global.USER_ROLE === 'user') {
        setDailyDistanceKm(0);
      } else {
        setTargetDailyDistanceKm(0);
      }
    } finally {
      setDailyDistanceLoading(false);
    }
  }, []);

  /**
   * currentLocation을 ref에 동기화 (의존성 문제 해결)
   */
  useEffect(() => {
    currentLocationRef.current = currentLocation;
  }, [currentLocation]);

  /**
   * isTracking을 ref에 동기화 (AppState 핸들러의 stale closure 방지)
   */
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  /**
   * AsyncStorage에서 초기 진입 상태 로드 (이용자만)
   */
  useEffect(() => {
    if (Global.USER_ROLE !== 'user') return;

    const initEntryState = async () => {
      const saved = await storage.getGeofenceEntryState();
      setLastGeofenceCheck(saved);
      lastGeofenceCheckRef.current = saved;
      console.log('📍 지오펜스 진입 상태 로드 완료:', saved);
    };

    initEntryState();
  }, []);

  /**
   * WebSocket으로 위치 전송 (이용자만)
   * 포그라운드 상태에서만 작동 (백그라운드는 Task가 담당)
   */
  useEffect(() => {
    if (Global.USER_ROLE !== 'user') return;
    if (!isTracking) return;

    // 백그라운드 상태면 포그라운드 전송 중지
    if (appState.current !== 'active') {
      console.log('📱 백그라운드 상태: 포그라운드 전송 중지 (Task가 담당)');
      return;
    }

    const sendNow = async () => {
      const location = currentLocationRef.current;
      if (!location) return;

      // ⚠️ 포그라운드 상태 갱신 (백그라운드 Task와 중복 방지)
      await storage.setAppStateWithTimestamp('active');

      // 배터리 레벨 가져오기
      let batteryLevel: number | undefined;
      try {
        const level = await Battery.getBatteryLevelAsync();
        batteryLevel = Math.round(level * 100);
      } catch (error) {
        console.warn('⚠️ 포그라운드 배터리 레벨 조회 실패:', error);
        batteryLevel = undefined;
      }

      console.log(`📡 포그라운드: 위치 전송 시도 (배터리: ${batteryLevel}%)`);
      const result = await sendLocationUpdate({
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
        batteryLevel,
      });
      if (!result.ok) {
        console.warn('⚠️ 포그라운드 위치 전송 실패:', result.reason);
      }
    };

    // 즉시 전송
    sendNow();

    // 2초마다 전송
    websocketSendInterval.current = setInterval(() => {
      sendNow();
    }, 2000);

    return () => {
      if (websocketSendInterval.current) {
        clearInterval(websocketSendInterval.current);
        websocketSendInterval.current = null;
      }
    };
  }, [isTracking]); // currentLocation 제거 - ref 사용

  /**
   * AppState 변경 감지 (포그라운드/백그라운드)
   *
   * 개선 사항:
   * - isTransitioningRef로 race condition 방지 (빠른 전환 시)
   * - inactive → active와 background → active 분리 처리
   * - isTrackingRef 사용으로 stale closure 방지
   * - 타임스탬프 기반 appState 저장 (백그라운드 Task 동기화)
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // 🔒 전환 중이면 무시 (race condition 방지)
      if (isTransitioningRef.current) {
        console.log(`⏳ 이미 상태 전환 중, 무시: ${nextAppState}`);
        return;
      }

      // inactive 상태는 빠르게 처리 (전환 락 없이)
      if (nextAppState === 'inactive') {
        await storage.setAppStateWithTimestamp(nextAppState);
        appState.current = nextAppState;
        return;
      }

      // 🔒 전환 락 시작
      isTransitioningRef.current = true;

      try {
        // 앱 상태를 AsyncStorage에 저장 (타임스탬프 포함)
        await storage.setAppStateWithTimestamp(nextAppState);

        // ============================================
        // 🟢 background → active: 전체 복구 필요
        // ============================================
        if (appState.current === 'background' && nextAppState === 'active') {
          console.log('📱 백그라운드에서 포그라운드 복귀');

          // ✅ FGS는 계속 실행 유지 (Android 14+ 필수)
          // 포그라운드에서 중지하면 다시 백그라운드 갈 때 시작 불가
          console.log('📱 FGS 계속 실행 유지 (stopTracking 시에만 중지)');

          // 1. watchPositionAsync 재시작 (재시도 로직 포함)
          console.log('🔄 watchPositionAsync 재시작 중...');
          const watchStarted = await startWatchPositionWithRetry(3);
          if (!watchStarted) {
            console.error('❌ watchPositionAsync 시작 실패 - 위치 추적이 작동하지 않을 수 있음');
          }

          // 2. WebSocket 재연결 (필요 시)
          if (Global.NUMBER) {
            const isConnected = websocketService.isConnected();
            console.log(`🔍 WebSocket 연결 상태: ${isConnected ? '연결됨' : '끊어짐'}`);

            if (!isConnected) {
              console.log('🔄 WebSocket 재연결 시도 (포그라운드 복귀)');
              try {
                await websocketService.disconnect();
                connectWebSocket();
              } catch (error) {
                console.error('❌ WebSocket 재연결 실패:', error);
              }
            }
          }

          // 3. 위치 전송 interval 재시작 (이용자만)
          // ⚠️ isTrackingRef.current 사용 (stale closure 방지)
          if (Global.USER_ROLE === 'user' && isTrackingRef.current) {
            // 기존 interval 정리
            if (websocketSendInterval.current) {
              clearInterval(websocketSendInterval.current);
              websocketSendInterval.current = null;
            }

            // sendNow 함수 정의
            const sendNow = async () => {
              const location = currentLocationRef.current;
              if (!location) return;

              // ⚠️ 포그라운드 상태 갱신 (백그라운드 Task와 중복 방지)
              await storage.setAppStateWithTimestamp('active');

              let batteryLevel: number | undefined;
              try {
                const level = await Battery.getBatteryLevelAsync();
                batteryLevel = Math.round(level * 100);
              } catch (error) {
                batteryLevel = undefined;
              }

              const result = await sendLocationUpdate({
                latitude: location.latitude,
                longitude: location.longitude,
                timestamp: location.timestamp,
                batteryLevel,
              });
              if (!result.ok) {
                console.warn('⚠️ 포그라운드 위치 전송 실패:', result.reason);
              }
            };

            // 즉시 한 번 전송 + 2초 interval 시작
            sendNow();
            websocketSendInterval.current = setInterval(sendNow, 2000);
            console.log('✅ 포그라운드 위치 전송 재개 (2초 주기)');
          }
        }
        // ============================================
        // 🟡 inactive → active: 최소한의 처리
        // (전화, 시스템 팝업 등에서 복귀)
        // ============================================
        else if (appState.current === 'inactive' && nextAppState === 'active') {
          console.log('📱 inactive에서 active로 복귀 (경미한 전환)');

          // WebSocket 연결 상태만 확인 (watchPositionAsync는 건드리지 않음)
          if (Global.NUMBER && !websocketService.isConnected()) {
            console.log('🔄 WebSocket 재연결 시도 (inactive 복귀)');
            connectWebSocket();
          }

          // ⚠️ watchPositionAsync와 interval은 건드리지 않음
          // inactive에서는 계속 작동 중일 가능성이 높음
        }
        // ============================================
        // 🔴 active/inactive → background: 정리
        // ============================================
        else if (nextAppState === 'background' && appState.current !== 'background') {
          console.log(`📱 앱이 background 상태로 전환 (이전: ${appState.current})`);

          // 포그라운드 interval 중지
          if (websocketSendInterval.current) {
            clearInterval(websocketSendInterval.current);
            websocketSendInterval.current = null;
            console.log('⏸️ 포그라운드 위치 전송 중지');
          }

          // watchPositionAsync 중지
          if (locationSubscription.current) {
            try {
              locationSubscription.current.remove();
            } catch (error) {
              // 무시
            }
            locationSubscription.current = null;
            console.log('⏸️ watchPositionAsync 중지');
          }

          // ✅ FGS는 startTracking()에서 이미 시작됨 (Android 14+ 필수)
          // 백그라운드 진입 시 별도 시작 불필요 - 이미 실행 중
          console.log('📱 백그라운드 진입: FGS 이미 실행 중 (포그라운드에서 시작됨)');
        }
      } catch (error) {
        console.error('❌ AppState 변경 처리 중 오류:', error);
      } finally {
        // 🔓 전환 락 해제 (반드시 실행)
        isTransitioningRef.current = false;
        appState.current = nextAppState;
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isWebSocketConnected]);

  /**
   * 지오펜스 진입 감지 (user role만, 포그라운드에서만 실행)
   *
   * ⚠️ Android 백그라운드에서는 Kotlin FGS가 지오펜스 체크를 담당
   * ⚠️ iOS 백그라운드에서는 Expo Task가 지오펜스 체크를 담당
   */
  useEffect(() => {
    if (Global.USER_ROLE !== 'user' || geofences.length === 0) {
      return;
    }

    const checkAndRecordGeofenceEntry = async () => {
      // ⚠️ 백그라운드 상태면 체크하지 않음 (각 플랫폼의 백그라운드 서비스가 담당)
      if (appState.current !== 'active') {
        console.log('ℹ️ [지오펜스] 백그라운드 상태 - JS 체크 스킵 (네이티브 서비스가 담당)');
        return;
      }

      const location = currentLocationRef.current;
      if (!location) return;

      // 위치 데이터가 너무 오래된 경우 스킵 (30초 이상)
      const locationAge = Date.now() - location.timestamp;
      if (locationAge > 30000) {
        console.log(`ℹ️ [지오펜스] 위치 데이터가 오래됨 (${Math.round(locationAge / 1000)}초) - 스킵`);
        return;
      }

      console.log(`🔍 [포그라운드] 지오펜스 체크 시작`);

      // SharedPreferences에서 현재 상태 읽기 (Android: Kotlin과 동기화)
      const entryState = await storage.getGeofenceEntryState();
      console.log(`🔍 [포그라운드] 현재 진입 상태: ${JSON.stringify(entryState)}`);

      // 유틸리티 함수 호출
      const result = checkGeofenceEntry(
        location.latitude,
        location.longitude,
        geofences,
        entryState
      );

      console.log(`🔍 [포그라운드] 체크 결과: 진입=${result.entries.length}개, 이탈=${result.exits.length}개`);

      // 진입 처리 (락 + 실패 시 재시도)
      await processGeofenceEntries(result.entries, entryState, 'foreground');
      setLastGeofenceCheck({ ...entryState });
      lastGeofenceCheckRef.current = entryState;

      // 이탈 처리 (영구 지오펜스만)
      for (const exit of result.exits) {
        console.log(`🚪 영구 지오펜스 이탈: ${exit.name}`);
        delete entryState[exit.geofenceId];
        await storage.setGeofenceEntryState(entryState);
        setLastGeofenceCheck({ ...entryState });
        lastGeofenceCheckRef.current = entryState;
      }
    };

    // 10초마다 지오펜스 검사 (포그라운드에서만 실제 체크 수행)
    const geofenceCheckInterval = setInterval(() => {
      checkAndRecordGeofenceEntry();
    }, 10000);

    // 초기 검사 (즉시 실행)
    checkAndRecordGeofenceEntry();

    console.log('🔍 지오펜스 검사 시작 (10초 주기, 포그라운드에서만 실행)');

    return () => {
      clearInterval(geofenceCheckInterval);
      console.log('🔍 지오펜스 검사 중지');
    };
  }, [geofences]); // currentLocation 제거 - ref 사용으로 10초 주기 유지

  /**
   * 알림 초기화 (앱 시작 시)
   */
  useEffect(() => {
    let notificationListeners: any = null;

    const initNotifications = async () => {
      // 초기 앱 상태 저장 (타임스탬프 포함 - 백그라운드 Task 동기화용)
      await storage.setAppStateWithTimestamp(AppState.currentState);

      // 알림 리스너만 설정 (토큰 발급은 로그인 시 처리)
      notificationListeners = setupNotificationListeners();
    };

    initNotifications();

    return () => {
      if (notificationListeners) {
        cleanupNotificationListeners(notificationListeners);
      }
    };
  }, []);

  /**
   * 일일 이동거리 초기 로드 (로컬 + 서버)
   */
  useEffect(() => {
    const loadTodayDistance = async () => {
      // 로컬 스토리지에서 먼저 로드 (빠른 표시용)
      if (Global.USER_ROLE === 'user') {
        try {
          const today = new Date().toISOString().split('T')[0];
          const data = await storage.getDailyDistance(today);
          if (data && data.date === today) {
            setDailyDistance(data.distance);
            dailyDistanceRef.current = data.distance;
            console.log(`📊 로컬 이동 거리 로드: ${(data.distance / 1000).toFixed(2)} km`);
          }
        } catch (error) {
          console.error('❌ 로컬 이동거리 로드 실패:', error);
        }
      }

      // 서버 API에서 정확한 도보 거리 조회
      if (Global.NUMBER) {
        fetchDailyDistance();
      }
    };

    loadTodayDistance();
  }, [fetchDailyDistance]);

  /**
   * 자정 리셋 체크
   */
  useEffect(() => {
    if (Global.USER_ROLE !== 'user') return;

    const checkMidnight = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        console.log('🌙 자정: 일일 이동 거리 초기화');
        setDailyDistance(0);
        dailyDistanceRef.current = 0;
        setDailyDistanceKm(0);
        // 새 날짜 데이터를 서버에서 가져옴
        fetchDailyDistance();
      }
    }, 60000); // 1분마다 체크

    return () => clearInterval(checkMidnight);
  }, [fetchDailyDistance]);

  /**
   * 컴포넌트 언마운트 시 정리
   */
  useEffect(() => {
    return () => {
      stopTracking();
      if (websocketSendInterval.current) {
        clearInterval(websocketSendInterval.current);
      }
      // WebSocket은 앱 종료 시에만 해제 (페이지 전환 시 유지)
    };
  }, []);

  const value: LocationContextState = {
    isTracking,
    currentLocation,
    locationHistory,
    error,
    isLoading,
    isWebSocketConnected,
    targetLocation,
    geofences,
    loadGeofences,
    dailyDistance,
    dailyDistanceKm,
    targetDailyDistanceKm,
    dailyDistanceLoading,
    startTracking,
    stopTracking,
    connectWebSocket,
    disconnectWebSocket,
    setSupporterTarget,
    fetchDailyDistance,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

/**
 * useLocation Hook
 * LocationContext를 쉽게 사용하기 위한 커스텀 훅
 */
export const useLocation = (): LocationContextState => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
