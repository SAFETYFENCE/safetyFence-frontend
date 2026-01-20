/**
 * Background Location Service
 * 백그라운드에서도 위치 추적을 계속하기 위한 서비스
 * - expo-task-manager를 사용하여 백그라운드 작업 정의
 * - expo-location의 백그라운드 위치 추적 기능 활용
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { storage } from '../utils/storage';
import { checkGeofenceEntry } from '../utils/geofenceUtils';
import { processGeofenceEntries } from './geofenceEntryService';

// 백그라운드 위치 작업 이름
export const BACKGROUND_LOCATION_TASK = 'background-location-task';

/**
 * 백그라운드에서 지오펜스 진입/이탈 체크
 */
async function checkBackgroundGeofenceEntry(
  latitude: number,
  longitude: number
): Promise<void> {
  try {
    // 1. 캐시에서 지오펜스 목록 읽기
    const cache = await storage.getGeofenceCache();
    if (!cache) {
      console.log('ℹ️ [백그라운드] 지오펜스 캐시 없음');
      return;
    }

    console.log(`🔍 [백그라운드] 지오펜스 체크 시작: ${cache.data.length}개 지오펜스`);
    // 각 지오펜스의 ID와 타입 로깅
    cache.data.forEach((g, i) => {
      console.log(`   [${i}] id=${g.id} (type: ${typeof g.id}), name=${g.name}, type=${g.type}`);
    });

    // 2. 현재 진입 상태 읽기
    const entryState = await storage.getGeofenceEntryState();
    console.log(`🔍 [백그라운드] 현재 진입 상태:`, JSON.stringify(entryState));
    console.log(`🔍 [백그라운드] entryState 키 개수: ${Object.keys(entryState).length}`);

    // 3. 진입/이탈 체크
    const result = checkGeofenceEntry(
      latitude,
      longitude,
      cache.data,
      entryState
    );

    console.log(`🔍 [백그라운드] 체크 결과: 진입=${result.entries.length}개, 이탈=${result.exits.length}개`);

    // 4. 진입 처리 (락 + 실패 시 재시도)
    await processGeofenceEntries(result.entries, entryState, 'background');

    // 5. 이탈 처리 (영구 지오펜스만)
    for (const exit of result.exits) {
      console.log(`🚪 [백그라운드] 지오펜스 이탈: ${exit.name}`);
      delete entryState[exit.geofenceId];
      await storage.setGeofenceEntryState(entryState);
    }

  } catch (error) {
    console.error('❌ [백그라운드] 지오펜스 체크 실패:', error);
  }
}

// 지오펜스 캐시 갱신 마지막 시간 추적
let lastGeofenceCacheUpdate = 0;
const GEOFENCE_CACHE_UPDATE_INTERVAL = 2 * 60 * 1000; // 2분마다 갱신

/**
 * 백그라운드 위치 작업 정의
 * 앱이 백그라운드에 있을 때도 위치를 수신하고 서버로 전송
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('❌ 백그라운드 위치 작업 에러:', error);
    return;
  }

  if (!data) return;

  const { locations } = data;
  if (!locations?.length) return;

  // ⚠️ 중요: 배열의 마지막이 가장 최신 위치 (배치 처리 시 여러 위치가 올 수 있음)
  const location = locations[locations.length - 1];
  const locationAge = Date.now() - location.timestamp;

  console.log('📍 백그라운드 위치 수신:', {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    timestamp: location.timestamp,
    age: `${Math.round(locationAge / 1000)}초 전`,
    batchSize: locations.length,
  });

  // 위치가 너무 오래된 경우 (60초 이상) 경고 로그
  if (locationAge > 60000) {
    console.warn(`⚠️ [백그라운드] 오래된 위치 감지: ${Math.round(locationAge / 1000)}초 전`);
  }

  try {
    const userRole = await storage.getUserRole();
    if (userRole !== 'user') {
      console.log('ℹ️ 백그라운드: 이용자가 아니어서 위치 전송 생략');
      return;
    }

    // 앱 상태 확인 (타임스탬프 기반 - 포그라운드면 위치 전송 생략)
    // 5초 이내 업데이트된 상태만 신뢰 (동기화 지연 문제 방지)
    const isInForeground = await storage.isInForeground(5000);
    console.log(`🔍 [백그라운드] 포그라운드 여부: ${isInForeground}`);

    // 주기적으로 지오펜스 캐시 갱신 (2분마다)
    const now = Date.now();
    if (now - lastGeofenceCacheUpdate > GEOFENCE_CACHE_UPDATE_INTERVAL) {
      try {
        console.log('🔄 [백그라운드] 지오펜스 목록 갱신 중...');
        const { geofenceService } = require('./geofenceService');
        const freshGeofences = await geofenceService.getList();
        await storage.setGeofenceCache(freshGeofences);
        lastGeofenceCacheUpdate = now;
        console.log(`✅ [백그라운드] 지오펜스 목록 갱신 완료: ${freshGeofences.length}개`);
      } catch (cacheError) {
        console.warn('⚠️ [백그라운드] 지오펜스 캐시 갱신 실패:', cacheError);
      }
    }

    // 포그라운드 상태에서는 백그라운드 Task 자체의 처리를 중단
    if (isInForeground) {
      console.log('ℹ️ [백그라운드] 포그라운드 상태: Task 처리 종료');
      return;
    }

    // ⚠️ 백그라운드 위치 전송은 네이티브 서비스가 담당
    // 여기서는 지오펜스 체크만 수행
    await checkBackgroundGeofenceEntry(
      location.coords.latitude,
      location.coords.longitude
    );
  } catch (err) {
    console.error('❌ 백그라운드 위치 전송 처리 중 오류:', err);
  }
});

/**
 * 백그라운드 위치 추적 시작
 */
export const startBackgroundLocationTracking = async (): Promise<boolean> => {
  try {
    console.log('🔍 백그라운드 위치 추적 시작 시도...');

    // Task 등록 확인
    const isTaskDefined = await TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
    console.log(`🔍 Task 정의 여부: ${isTaskDefined}`);

    // 백그라운드 권한 확인
    const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
    console.log(`🔍 포그라운드 권한: ${foregroundStatus}`);

    if (foregroundStatus !== 'granted') {
      console.error('❌ 포그라운드 위치 권한이 필요합니다.');
      return false;
    }

    const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
    console.log(`🔍 백그라운드 권한: ${backgroundStatus}`);

    if (backgroundStatus !== 'granted') {
      console.error('❌ 백그라운드 위치 권한이 필요합니다.');
      return false;
    }

    console.log('🔍 Location.startLocationUpdatesAsync 호출 중...');

    // 백그라운드 위치 추적 시작
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 15000, // 15초마다 업데이트
      distanceInterval: 10, // 10미터 이동 시 업데이트
      foregroundService: {
        notificationTitle: 'SafetyFence 위치 추적',
        notificationBody: '안전을 위해 위치를 추적하고 있습니다.',
        notificationColor: '#22c55e', // green-500
      },
      pausesUpdatesAutomatically: false, // 자동 일시정지 비활성화
      showsBackgroundLocationIndicator: true, // iOS에서 백그라운드 위치 표시
    });

    console.log('✅ Location.startLocationUpdatesAsync 성공');

    // 등록 확인
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    console.log(`✅ Task 등록 확인: ${isRegistered}`);

    console.log('✅ 백그라운드 위치 추적 시작 완료');
    return true;
  } catch (error: any) {
    console.error('❌ 백그라운드 위치 추적 에러 발생:', {
      message: error?.message,
      code: error?.code,
      error: error,
    });

    // Expo Go 제한사항: 백그라운드 위치 추적 불가능
    // Development Build에서는 정상 작동
    const isExpoGoLimitation = error?.message?.includes('Foreground service cannot be started');
    if (isExpoGoLimitation) {
      console.log('ℹ️ Expo Go 제한사항 (예상된 동작)');
      return false;
    }

    // 다른 에러는 실제 문제일 수 있으므로 로그
    console.warn('⚠️ 백그라운드 위치 추적 시작 실패:', error?.message || error);
    return false;
  }
};

/**
 * 백그라운드 위치 추적 중지
 */
export const stopBackgroundLocationTracking = async (): Promise<void> => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('✅ 백그라운드 위치 추적 중지');
    }
  } catch (error) {
    console.error('❌ 백그라운드 위치 추적 중지 실패:', error);
  }
};

/**
 * 백그라운드 위치 추적 상태 확인
 */
export const isBackgroundLocationTrackingActive = async (): Promise<boolean> => {
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  } catch (error) {
    console.error('❌ 백그라운드 위치 추적 상태 확인 실패:', error);
    return false;
  }
};
