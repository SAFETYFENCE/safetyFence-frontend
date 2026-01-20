/**
 * Android 배터리 최적화 관련 유틸리티
 * - 배터리 최적화 설정 화면으로 이동
 * - 백그라운드 위치 추적을 위해 배터리 최적화 제외 필요
 */

import { Alert, Linking, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

/**
 * 배터리 최적화 설정 화면 열기
 * Android에서만 작동
 */
export const openBatteryOptimizationSettings = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    console.log('ℹ️ 배터리 최적화 설정은 Android에서만 사용 가능');
    return;
  }

  try {
    // 방법 1: 앱별 배터리 최적화 설정 화면 열기 시도
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      {
        data: 'package:com.paypass.safetyfence',
      }
    );
  } catch (error) {
    console.warn('⚠️ REQUEST_IGNORE_BATTERY_OPTIMIZATIONS 실패, 일반 설정으로 이동:', error);

    try {
      // 방법 2: 배터리 최적화 전체 목록 화면 열기
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
      );
    } catch (error2) {
      console.warn('⚠️ IGNORE_BATTERY_OPTIMIZATION_SETTINGS 실패, 앱 설정으로 이동:', error2);

      // 방법 3: 일반 앱 설정 화면 열기
      Linking.openSettings();
    }
  }
};

/**
 * 배터리 최적화 제외 안내 Alert 표시
 * @param onConfirm 설정 화면 이동 후 콜백 (선택사항)
 */
export const showBatteryOptimizationAlert = (onConfirm?: () => void): void => {
  if (Platform.OS !== 'android') {
    onConfirm?.();
    return;
  }

  Alert.alert(
    '📱 백그라운드 실행 권한 필요',
    '백그라운드에서도 안전하게 위치를 전송하려면 배터리 최적화에서 SafetyFence를 제외해주세요.\n\n' +
    '설정 방법:\n' +
    '1. 아래 "설정으로 이동" 클릭\n' +
    '2. "제한 없음" 또는 "최적화하지 않음" 선택\n\n' +
    '⚠️ 이 설정이 없으면 앱이 백그라운드에서 약 5분 후 종료될 수 있습니다.',
    [
      {
        text: '나중에',
        style: 'cancel',
        onPress: onConfirm,
      },
      {
        text: '설정으로 이동',
        onPress: async () => {
          await openBatteryOptimizationSettings();
          onConfirm?.();
        },
      },
    ],
    { cancelable: false }
  );
};

/**
 * 백그라운드 위치 추적 시작 전 배터리 최적화 안내
 * 최초 1회만 안내하도록 AsyncStorage에 플래그 저장
 */
export const checkAndRequestBatteryOptimization = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const BATTERY_OPT_SHOWN_KEY = '@safetyFence:batteryOptShown';

    const alreadyShown = await AsyncStorage.getItem(BATTERY_OPT_SHOWN_KEY);

    if (!alreadyShown) {
      // 최초 1회 안내
      showBatteryOptimizationAlert(async () => {
        await AsyncStorage.setItem(BATTERY_OPT_SHOWN_KEY, 'true');
      });
    }
  } catch (error) {
    console.error('❌ 배터리 최적화 체크 실패:', error);
  }
};

/**
 * 배터리 최적화 안내 플래그 초기화 (설정에서 다시 안내받고 싶을 때)
 */
export const resetBatteryOptimizationFlag = async (): Promise<void> => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const BATTERY_OPT_SHOWN_KEY = '@safetyFence:batteryOptShown';
    await AsyncStorage.removeItem(BATTERY_OPT_SHOWN_KEY);
    console.log('✅ 배터리 최적화 안내 플래그 초기화');
  } catch (error) {
    console.error('❌ 배터리 최적화 플래그 초기화 실패:', error);
  }
};
