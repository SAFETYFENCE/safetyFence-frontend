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
import { Accelerometer } from 'expo-sensors';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Linking } from 'react-native';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from '../services/backgroundLocationService';
import { geofenceService } from '../services/geofenceService';
import { sendLocationUpdate } from '../services/locationTransport';
import { websocketService } from '../services/websocketService';
import { setupNotificationListeners, cleanupNotificationListeners } from '../services/notificationService';
import { checkGeofenceEntry } from '../utils/geofenceUtils';
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

  // 함수
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  connectWebSocket: () => void;
  disconnectWebSocket: () => Promise<void>;
  setSupporterTarget: (targetNumber: string) => void;
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

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const websocketSendInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const stopTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accelerometerSubscription = useRef<{ remove: () => void } | null>(null);
  const supporterTargetRef = useRef<string | null>(null);
  const currentLocationRef = useRef<RealTimeLocation | null>(null);

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

    // 위치 전송은 별도 setInterval이 담당 (중복 방지)
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

      // 백그라운드 위치 추적 시작 (포그라운드에서 미리 시작해야 함!) - 이용자만
      if (Global.USER_ROLE === 'user') {
        try {
          console.log('📍 백그라운드 위치 서비스 시작 (포그라운드에서)');
          const started = await startBackgroundLocationTracking();
          if (started) {
            console.log('✅ 백그라운드 위치 서비스 준비 완료');
          } else {
            console.warn('⚠️ 백그라운드 위치 서비스 시작 실패 (권한 또는 제한사항)');
          }
        } catch (error) {
          console.warn('⚠️ 백그라운드 위치 서비스 시작 중 오류:', error);
        }

        // 움직임 감지 시작 (배터리 최적화)
        try {
          setupMovementDetection();
          console.log('✅ 배터리 최적화: 움직임 감지 시작');
        } catch (error) {
          console.warn('⚠️ 움직임 감지 설정 실패:', error);
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

    // 백그라운드 위치 추적도 중지
    await stopBackgroundLocationTracking();

    // 움직임 감지 타이머 정리
    if (stopTimeout.current) {
      clearTimeout(stopTimeout.current);
      stopTimeout.current = null;
    }

    // Accelerometer 구독 해제
    if (accelerometerSubscription.current) {
      accelerometerSubscription.current.remove();
      accelerometerSubscription.current = null;
    }
  };

  /**
   * 움직임 감지 설정 (배터리 최적화)
   * 백그라운드에서만 작동 - 포그라운드에서는 watchPositionAsync가 작동 중
   */
  const setupMovementDetection = () => {
    Accelerometer.setUpdateInterval(1000); // 1초 간격
    const subscription = Accelerometer.addListener(accelerometerData => {
      const { x, y, z } = accelerometerData;
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // 포그라운드에서는 움직임 감지 무시 (watchPositionAsync가 작동 중)
      const isBackground = appState.current.match(/inactive|background/);
      if (!isBackground) {
        return;
      }

      if (magnitude > 1.1) { // 움직임 감지
        if (stopTimeout.current) {
          clearTimeout(stopTimeout.current);
          stopTimeout.current = null;
          console.log('📱 움직임 감지됨, 위치 추적 중지 타이머 취소');
        }
        // 백그라운드 상태에서만 백그라운드 위치 추적 재시작
        if (Global.USER_ROLE === 'user') {
          startBackgroundLocationTracking().then(started => {
            if (started) {
              console.log('✅ 움직임 감지: 백그라운드 위치 추적 활성화');
            }
          });
        }
      } else { // 움직임 없음
        if (!stopTimeout.current) {
          console.log('📱 움직임 없음, 10분 후 위치 추적 중지 예약');
          stopTimeout.current = setTimeout(() => {
            if (Global.USER_ROLE === 'user') {
              stopBackgroundLocationTracking().then(() => {
                console.log('⏸️ 배터리 절약: 백그라운드 위치 추적 중지');
              });
            }
            stopTimeout.current = null;
          }, 600000); // 10분
        }
      }
    });

    accelerometerSubscription.current = subscription;
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
      }

      console.log(`✅ 지오펜스 목록 로드 성공: ${data.length}개 (${Global.USER_ROLE === 'supporter' ? `이용자: ${targetNumber}` : '본인'})`);
    } catch (error) {
      console.error('❌ 지오펜스 목록 로드 실패:', error);
      setGeofences([]); // 에러 시 빈 배열
    }
  }, []);

  /**
   * currentLocation을 ref에 동기화 (의존성 문제 해결)
   */
  useEffect(() => {
    currentLocationRef.current = currentLocation;
  }, [currentLocation]);

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

      console.log('📡 포그라운드: 위치 전송 시도');
      const result = await sendLocationUpdate({
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: location.timestamp,
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
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      try {
        // 앱 상태를 AsyncStorage에 저장 (백그라운드 Task가 읽을 수 있도록)
        await storage.setItem('appState', nextAppState);

        // inactive 상태는 무시 (잠깐 멈춤일 뿐)
        if (nextAppState === 'inactive') {
          appState.current = nextAppState;
          return;
        }

        // 포그라운드 복귀: inactive 또는 background → active
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
          console.log('📱 앱이 포그라운드로 돌아옴');

          // 백그라운드 Service는 계속 실행 (중지하지 않음)

          // watchPositionAsync 무조건 재시작 (포그라운드 복귀 시)
          console.log(`🔍 watchPositionAsync 이전 상태: ${locationSubscription.current ? '실행 중' : '중지됨'}`);

          try {
            // 기존 구독이 있으면 먼저 정리
            if (locationSubscription.current) {
              console.log('🔄 기존 watchPositionAsync 중지...');
              try {
                locationSubscription.current.remove();
              } catch (removeError) {
                console.warn('⚠️ 기존 구독 제거 실패 (무시):', removeError);
              }
              locationSubscription.current = null;
            }

            // 새로 시작
            console.log('🔄 watchPositionAsync 새로 시작...');
            const sub = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.High,
                timeInterval: 2000,
                distanceInterval: 10,
              },
              handleLocationUpdate // 공통 핸들러 사용
            );
            locationSubscription.current = sub;
            console.log('✅ 포그라운드 watchPositionAsync 시작 완료');
          } catch (error) {
            console.error('❌ watchPositionAsync 시작 실패:', error);
          }

          // WebSocket 재연결 (연결되어 있지 않을 때만)
          if (Global.NUMBER) {
            const isConnected = websocketService.isConnected();
            console.log(`🔍 WebSocket 연결 상태: ${isConnected ? '연결됨' : '끊어짐'}`);

            if (!isConnected) {
              console.log('🔄 WebSocket 재연결 시도 (포그라운드 복귀)');
              try {
                connectWebSocket();
              } catch (error) {
                console.error('❌ WebSocket 재연결 실패:', error);
              }
            } else {
              console.log('ℹ️ WebSocket이 이미 연결되어 있으므로 재연결 생략');
            }
          }

          // 위치 전송 setInterval 재시작 (이용자만)
          if (Global.USER_ROLE === 'user' && isTracking) {
            // 기존 interval이 있으면 정리
            if (websocketSendInterval.current) {
              clearInterval(websocketSendInterval.current);
              websocketSendInterval.current = null;
            }

            // 즉시 한 번 전송
            const sendNow = async () => {
              const location = currentLocationRef.current;
              if (!location) return;

              console.log('📡 포그라운드: 위치 전송 시도');
              const result = await sendLocationUpdate({
                latitude: location.latitude,
                longitude: location.longitude,
                timestamp: location.timestamp,
              });
              if (!result.ok) {
                console.warn('⚠️ 포그라운드 위치 전송 실패:', result.reason);
              }
            };

            sendNow();

            // 2초마다 전송
            websocketSendInterval.current = setInterval(() => {
              sendNow();
            }, 2000);

            console.log('✅ 포그라운드 위치 전송 재개 (2초 주기)');
          }

        } else if (appState.current === 'active' && nextAppState === 'background') {
          // 진짜 백그라운드 전환: active → background (inactive는 무시)
          console.log('📱 앱이 background 상태로 전환');

          // 포그라운드 setInterval 중지
          if (websocketSendInterval.current) {
            clearInterval(websocketSendInterval.current);
            websocketSendInterval.current = null;
            console.log('⏸️ 포그라운드 위치 전송 중지');
          }

          // watchPositionAsync 중지 (백그라운드에서는 어차피 작동 안 함)
          if (locationSubscription.current) {
            try {
              locationSubscription.current.remove();
              locationSubscription.current = null;
              console.log('⏸️ watchPositionAsync 중지 (백그라운드에서 자동 멈춤)');
            } catch (error) {
              console.warn('⚠️ watchPositionAsync 중지 실패 (무시):', error);
            }
          }

          // 백그라운드 Service는 이미 실행 중 (아무것도 안 함)
          console.log('ℹ️ 백그라운드 위치 서비스는 계속 실행 중');
        }
      } catch (error) {
        console.error('❌ AppState 변경 처리 중 오류:', error);
      } finally {
        appState.current = nextAppState;
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isWebSocketConnected]);

  /**
   * 지오펜스 진입 감지 (user role만, 항상 실행)
   */
  useEffect(() => {
    if (Global.USER_ROLE !== 'user' || geofences.length === 0) {
      return;
    }

    const checkAndRecordGeofenceEntry = async () => {
      const location = currentLocationRef.current;
      if (!location) return;

      // AsyncStorage에서 현재 상태 읽기 (백그라운드와 동기화)
      const entryState = await storage.getGeofenceEntryState();

      // 유틸리티 함수 호출
      const result = checkGeofenceEntry(
        location.latitude,
        location.longitude,
        geofences,
        entryState
      );

      // 진입 처리
      for (const entry of result.entries) {
        // ⚠️ 중요: API 호출 전에 먼저 entryState 저장 (race condition 방지)
        entryState[entry.geofenceId] = true;
        await storage.setGeofenceEntryState(entryState);
        setLastGeofenceCheck({ ...entryState });
        lastGeofenceCheckRef.current = entryState;

        try {
          await geofenceService.recordEntry({ geofenceId: entry.geofenceId });
          console.log(`✅ 지오펜스 진입 기록: ${entry.name}`);
        } catch (error) {
          // 일시형 지오펜스가 이미 삭제되었거나 중복 요청인 경우
          console.warn(`⚠️ 지오펜스 진입 기록 실패 (이미 처리됨): ${entry.name}`, error);
        }
      }

      // 이탈 처리 (영구 지오펜스만)
      for (const exit of result.exits) {
        console.log(`🚪 영구 지오펜스 이탈: ${exit.name}`);
        delete entryState[exit.geofenceId];
        await storage.setGeofenceEntryState(entryState);
        setLastGeofenceCheck({ ...entryState });
        lastGeofenceCheckRef.current = entryState;
      }
    };

    // 10초마다 지오펜스 검사
    const geofenceCheckInterval = setInterval(() => {
      checkAndRecordGeofenceEntry();
    }, 10000);

    // 초기 검사 (즉시 실행)
    checkAndRecordGeofenceEntry();

    console.log('🔍 지오펜스 검사 시작 (10초 주기, 항상 실행)');

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
      // 초기 앱 상태 저장 (백그라운드 Task가 읽을 수 있도록)
      await storage.setItem('appState', AppState.currentState);

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
   * 컴포넌트 언마운트 시 정리
   */
  useEffect(() => {
    return () => {
      stopTracking();
      if (websocketSendInterval.current) {
        clearInterval(websocketSendInterval.current);
      }
      // Accelerometer 정리
      if (stopTimeout.current) {
        clearTimeout(stopTimeout.current);
        stopTimeout.current = null;
      }
      if (accelerometerSubscription.current) {
        accelerometerSubscription.current.remove();
        accelerometerSubscription.current = null;
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
    startTracking,
    stopTracking,
    connectWebSocket,
    disconnectWebSocket,
    setSupporterTarget,
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
