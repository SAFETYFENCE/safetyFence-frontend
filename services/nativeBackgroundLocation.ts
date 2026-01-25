import { NativeModules, Platform } from 'react-native';

type StartOptions = {
  baseUrl: string;
  apiKey: string;
  userNumber: string;
  geofenceCache?: string; // JSON 문자열로 전달
};

const { BackgroundLocation } = NativeModules as {
  BackgroundLocation?: {
    start: (options: StartOptions) => Promise<boolean>;
    stop: () => Promise<boolean>;
    updateGeofenceCache: (geofenceCache: string | null) => Promise<boolean>;
    getEntryState: () => Promise<string>;
    setEntryState: (stateJson: string | null) => Promise<boolean>;
    getEntryLocks: () => Promise<string>;
    setEntryLocks: (locksJson: string | null) => Promise<boolean>;
  };
};

export const startNativeBackgroundLocation = async (options: StartOptions): Promise<boolean> => {
  if (Platform.OS !== 'android' || !BackgroundLocation?.start) {
    return false;
  }
  return BackgroundLocation.start(options);
};

export const stopNativeBackgroundLocation = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !BackgroundLocation?.stop) {
    return false;
  }
  return BackgroundLocation.stop();
};

/**
 * 네이티브 백그라운드 서비스의 지오펜스 캐시 업데이트
 */
export const updateNativeGeofenceCache = async (geofenceCache: string | null): Promise<boolean> => {
  if (Platform.OS !== 'android' || !BackgroundLocation?.updateGeofenceCache) {
    return false;
  }
  return BackgroundLocation.updateGeofenceCache(geofenceCache);
};

/**
 * 네이티브 진입 상태 가져오기 (Android SharedPreferences)
 */
export const getNativeEntryState = async (): Promise<{ [key: number]: boolean } | null> => {
  if (Platform.OS !== 'android' || !BackgroundLocation?.getEntryState) {
    return null;
  }
  try {
    const stateStr = await BackgroundLocation.getEntryState();
    return JSON.parse(stateStr);
  } catch {
    return {};
  }
};

/**
 * 네이티브 진입 상태 저장 (Android SharedPreferences)
 */
export const setNativeEntryState = async (state: { [key: number]: boolean }): Promise<boolean> => {
  if (Platform.OS !== 'android' || !BackgroundLocation?.setEntryState) {
    return false;
  }
  return BackgroundLocation.setEntryState(JSON.stringify(state));
};

/**
 * 네이티브 진입 락 가져오기 (Android SharedPreferences)
 */
export const getNativeEntryLocks = async (): Promise<{ [key: number]: number } | null> => {
  if (Platform.OS !== 'android' || !BackgroundLocation?.getEntryLocks) {
    return null;
  }
  try {
    const locksStr = await BackgroundLocation.getEntryLocks();
    return JSON.parse(locksStr);
  } catch {
    return {};
  }
};

/**
 * 네이티브 진입 락 저장 (Android SharedPreferences)
 */
export const setNativeEntryLocks = async (locks: { [key: number]: number }): Promise<boolean> => {
  if (Platform.OS !== 'android' || !BackgroundLocation?.setEntryLocks) {
    return false;
  }
  return BackgroundLocation.setEntryLocks(JSON.stringify(locks));
};
