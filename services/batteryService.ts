import * as Battery from 'expo-battery';
import apiClient from '../utils/api/axiosConfig';

/**
 * 배터리 관리 서비스
 * - 디바이스 배터리 레벨 모니터링
 * - 서버에 배터리 정보 업데이트
 */

export interface BatteryUpdateRequest {
  batteryLevel: number;
}

export interface BatteryUpdateResponse {
  batteryLevel: number;
  timestamp: string;
}

/**
 * 현재 배터리 레벨 가져오기 (0-100)
 */
export const getBatteryLevel = async (): Promise<number> => {
  try {
    const batteryLevel = await Battery.getBatteryLevelAsync();
    // 0.0 ~ 1.0 값을 0 ~ 100 으로 변환
    return Math.round(batteryLevel * 100);
  } catch (error) {
    console.error('❌ 배터리 레벨 조회 실패:', error);
    return -1; // 에러 시 -1 반환
  }
};

/**
 * 배터리 상태 가져오기
 */
export const getBatteryState = async (): Promise<Battery.BatteryState> => {
  try {
    return await Battery.getBatteryStateAsync();
  } catch (error) {
    console.error('❌ 배터리 상태 조회 실패:', error);
    return Battery.BatteryState.UNKNOWN;
  }
};

/**
 * 충전 중인지 확인
 */
export const isCharging = async (): Promise<boolean> => {
  const state = await getBatteryState();
  return state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;
};

/**
 * 서버에 배터리 레벨 업데이트
 * POST /battery
 */
export const updateBatteryToServer = async (batteryLevel: number): Promise<boolean> => {
  try {
    const body: BatteryUpdateRequest = {
      batteryLevel,
    };

    const response = await apiClient.post<BatteryUpdateResponse>('/battery', body);
    console.log(`✅ 배터리 업데이트 성공: ${batteryLevel}% (서버: ${response.data.timestamp})`);
    return true;
  } catch (error) {
    console.error('❌ 배터리 업데이트 실패:', error);
    return false;
  }
};

/**
 * 배터리 레벨 변경 감지 리스너 등록
 * @param callback 배터리 레벨 변경 시 호출될 콜백 (0-100)
 * @returns 리스너 구독 객체 (구독 해제 시 사용)
 */
export const addBatteryLevelListener = (
  callback: (batteryLevel: number) => void
): Battery.Subscription => {
  return Battery.addBatteryLevelListener(({ batteryLevel }) => {
    const level = Math.round(batteryLevel * 100);
    callback(level);
  });
};

/**
 * 배터리 상태 변경 감지 리스너 등록
 * @param callback 배터리 상태 변경 시 호출될 콜백
 * @returns 리스너 구독 객체
 */
export const addBatteryStateListener = (
  callback: (state: Battery.BatteryState) => void
): Battery.Subscription => {
  return Battery.addBatteryStateListener(({ batteryState }) => {
    callback(batteryState);
  });
};

export const batteryService = {
  getBatteryLevel,
  getBatteryState,
  isCharging,
  updateBatteryToServer,
  addBatteryLevelListener,
  addBatteryStateListener,
};
