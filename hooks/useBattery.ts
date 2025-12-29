import { useCallback, useEffect, useRef, useState } from 'react';
import { batteryService } from '../services/batteryService';
import type * as Battery from 'expo-battery';

/**
 * 배터리 모니터링 커스텀 훅
 * - 실시간 배터리 레벨 추적
 * - 주기적으로 서버에 배터리 정보 업데이트
 * - 배터리 상태 변경 감지
 */

interface UseBatteryOptions {
  /** 서버 업데이트 간격 (밀리초), 기본값: 5분 */
  updateInterval?: number;
  /** 자동으로 서버 업데이트 활성화 여부, 기본값: true */
  autoUpdate?: boolean;
}

export const useBattery = (options: UseBatteryOptions = {}) => {
  const { updateInterval = 5 * 60 * 1000, autoUpdate = true } = options; // 기본 5분

  const [batteryLevel, setBatteryLevel] = useState<number>(-1); // -1: 로딩 중
  const [batteryState, setBatteryState] = useState<Battery.BatteryState>(
    2 // Battery.BatteryState.UNKNOWN
  );
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const levelSubscriptionRef = useRef<Battery.Subscription | null>(null);
  const stateSubscriptionRef = useRef<Battery.Subscription | null>(null);

  /**
   * 배터리 정보 초기화
   */
  const initializeBattery = useCallback(async () => {
    try {
      // 현재 배터리 레벨 가져오기
      const level = await batteryService.getBatteryLevel();
      setBatteryLevel(level);

      // 현재 배터리 상태 가져오기
      const state = await batteryService.getBatteryState();
      setBatteryState(state);

      // 충전 중인지 확인
      const charging = await batteryService.isCharging();
      setIsCharging(charging);

      console.log(`🔋 배터리 초기화: ${level}%, 충전: ${charging}`);
    } catch (error) {
      console.error('❌ 배터리 초기화 실패:', error);
    }
  }, []);

  /**
   * 서버에 배터리 레벨 업데이트
   */
  const updateToServer = useCallback(async () => {
    if (batteryLevel < 0) return; // 유효한 배터리 레벨이 없으면 스킵

    const success = await batteryService.updateBatteryToServer(batteryLevel);
    if (success) {
      setLastUpdateTime(new Date());
    }
  }, [batteryLevel]);

  /**
   * 수동으로 배터리 정보 새로고침
   */
  const refresh = useCallback(async () => {
    await initializeBattery();
    await updateToServer();
  }, [initializeBattery, updateToServer]);

  /**
   * 배터리 레벨 변경 리스너 설정
   */
  useEffect(() => {
    // 배터리 레벨 변경 감지
    levelSubscriptionRef.current = batteryService.addBatteryLevelListener((level) => {
      console.log(`🔋 배터리 레벨 변경: ${level}%`);
      setBatteryLevel(level);
    });

    // 배터리 상태 변경 감지 (충전/방전)
    stateSubscriptionRef.current = batteryService.addBatteryStateListener((state) => {
      console.log(`🔋 배터리 상태 변경: ${state}`);
      setBatteryState(state);
      setIsCharging(
        state === 1 || state === 4 // CHARGING(1) or FULL(4)
      );
    });

    // Cleanup
    return () => {
      levelSubscriptionRef.current?.remove();
      stateSubscriptionRef.current?.remove();
    };
  }, []);

  /**
   * 초기화 및 주기적 서버 업데이트
   */
  useEffect(() => {
    // 초기화
    initializeBattery();

    // 자동 업데이트 활성화 시
    if (autoUpdate) {
      // 즉시 한 번 업데이트
      updateToServer();

      // 주기적으로 업데이트
      intervalRef.current = setInterval(() => {
        updateToServer();
      }, updateInterval);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoUpdate, updateInterval, initializeBattery, updateToServer]);

  return {
    /** 배터리 레벨 (0-100), -1은 로딩 중 */
    batteryLevel,
    /** 배터리 상태 (UNKNOWN, UNPLUGGED, CHARGING, FULL) */
    batteryState,
    /** 충전 중 여부 */
    isCharging,
    /** 마지막 서버 업데이트 시간 */
    lastUpdateTime,
    /** 수동으로 배터리 정보 새로고침 */
    refresh,
    /** 수동으로 서버에 업데이트 */
    updateToServer,
  };
};
