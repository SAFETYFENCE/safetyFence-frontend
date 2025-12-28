import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GeofenceItem } from '../types/api';

/**
 * AsyncStorage 래퍼 유틸리티
 * API 키 및 사용자 정보 저장/불러오기/삭제
 */

const STORAGE_KEYS = {
  API_KEY: '@safetyFence:apiKey',
  USER_NUMBER: '@safetyFence:userNumber',
  USER_NAME: '@safetyFence:userName',
  USER_ROLE: '@safetyFence:userRole',
  TARGET_NUMBER: '@safetyFence:targetNumber',
  FCM_TOKEN: '@safetyFence:fcmToken',
  GEOFENCE_ENTRY_STATE: '@safetyFence:geofenceEntryState',
  GEOFENCE_CACHE: '@safetyFence:geofenceCache',
  MEDICINE_LIST: '@safetyFence:medicineList',
  MEDICINE_LOGS: '@safetyFence:medicineLogs',
  AUTO_LOGIN: '@safetyFence:autoLogin',
} as const;

interface GeofenceCache {
  data: GeofenceItem[];
  timestamp: number;
}

export const storage = {
  // API 키 저장
  async setApiKey(apiKey: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    } catch (error) {
      console.error('API 키 저장 실패:', error);
      throw error;
    }
  },

  // API 키 가져오기
  async getApiKey(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.API_KEY);
    } catch (error) {
      console.error('API 키 가져오기 실패:', error);
      return null;
    }
  },

  // 사용자 번호 저장
  async setUserNumber(number: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_NUMBER, number);
    } catch (error) {
      console.error('사용자 번호 저장 실패:', error);
      throw error;
    }
  },

  // 사용자 번호 가져오기
  async getUserNumber(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.USER_NUMBER);
    } catch (error) {
      console.error('사용자 번호 가져오기 실패:', error);
      return null;
    }
  },

  // 사용자 이름 저장
  async setUserName(name: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, name);
    } catch (error) {
      console.error('사용자 이름 저장 실패:', error);
      throw error;
    }
  },

  // 사용자 이름 가져오기
  async getUserName(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.USER_NAME);
    } catch (error) {
      console.error('사용자 이름 가져오기 실패:', error);
      return null;
    }
  },

  // 사용자 역할 저장
  async setUserRole(role: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    } catch (error) {
      console.error('사용자 역할 저장 실패:', error);
      throw error;
    }
  },

  // 사용자 역할 가져오기
  async getUserRole(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
    } catch (error) {
      console.error('사용자 역할 가져오기 실패:', error);
      return null;
    }
  },

  // 대상 번호 저장 (보호자가 추적할 이용자 번호)
  async setTargetNumber(targetNumber: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TARGET_NUMBER, targetNumber);
    } catch (error) {
      console.error('대상 번호 저장 실패:', error);
      throw error;
    }
  },

  // 대상 번호 가져오기
  async getTargetNumber(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.TARGET_NUMBER);
    } catch (error) {
      console.error('대상 번호 가져오기 실패:', error);
      return null;
    }
  },

  // 전체 로그인 정보 저장
  async setLoginInfo(apiKey: string, userNumber: string, userName: string): Promise<void> {
    try {
      await Promise.all([
        this.setApiKey(apiKey),
        this.setUserNumber(userNumber),
        this.setUserName(userName),
      ]);
    } catch (error) {
      console.error('로그인 정보 저장 실패:', error);
      throw error;
    }
  },

  // 로그아웃 (모든 정보 삭제)
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.API_KEY,
        STORAGE_KEYS.USER_NUMBER,
        STORAGE_KEYS.USER_NAME,
        STORAGE_KEYS.USER_ROLE,
        STORAGE_KEYS.TARGET_NUMBER,
        STORAGE_KEYS.FCM_TOKEN,
        STORAGE_KEYS.MEDICINE_LIST,
        STORAGE_KEYS.MEDICINE_LOGS,
      ]);
    } catch (error) {
      console.error('저장소 초기화 실패:', error);
      throw error;
    }
  },

  // 로그인 여부 확인
  async isLoggedIn(): Promise<boolean> {
    try {
      const apiKey = await this.getApiKey();
      return apiKey !== null;
    } catch (error) {
      console.error('로그인 여부 확인 실패:', error);
      return false;
    }
  },

  // 범용 setItem (FCM 토큰 등 추가 데이터 저장용)
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`@safetyFence:${key}`, value);
    } catch (error) {
      console.error(`${key} 저장 실패:`, error);
      throw error;
    }
  },

  // 범용 getItem
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(`@safetyFence:${key}`);
    } catch (error) {
      console.error(`${key} 가져오기 실패:`, error);
      return null;
    }
  },

  // ==================== Geofence 관련 ====================

  // 지오펜스 진입 상태 가져오기
  async getGeofenceEntryState(): Promise<{ [key: number]: boolean }> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.GEOFENCE_ENTRY_STATE);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('지오펜스 진입 상태 가져오기 실패:', error);
      return {};
    }
  },

  // 지오펜스 진입 상태 저장
  async setGeofenceEntryState(state: { [key: number]: boolean }): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GEOFENCE_ENTRY_STATE, JSON.stringify(state));
    } catch (error) {
      console.error('지오펜스 진입 상태 저장 실패:', error);
      throw error;
    }
  },

  // 지오펜스 캐시 가져오기 (TTL: 5분)
  async getGeofenceCache(): Promise<GeofenceCache | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.GEOFENCE_CACHE);
      if (!data) return null;

      const cache: GeofenceCache = JSON.parse(data);
      const now = Date.now();
      const CACHE_TTL = 5 * 60 * 1000; // 5분

      // 캐시 만료 체크
      if (now - cache.timestamp > CACHE_TTL) {
        console.log('ℹ️ 지오펜스 캐시 만료');
        await this.clearGeofenceCache();
        return null;
      }

      return cache;
    } catch (error) {
      console.error('지오펜스 캐시 가져오기 실패:', error);
      return null;
    }
  },

  // 지오펜스 캐시 저장
  async setGeofenceCache(data: GeofenceItem[]): Promise<void> {
    try {
      const cache: GeofenceCache = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEYS.GEOFENCE_CACHE, JSON.stringify(cache));
    } catch (error) {
      console.error('지오펜스 캐시 저장 실패:', error);
      throw error;
    }
  },

  // 지오펜스 캐시 삭제
  async clearGeofenceCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.GEOFENCE_CACHE);
    } catch (error) {
      console.error('지오펜스 캐시 삭제 실패:', error);
      throw error;
    }
  },

  // ==================== 약 관리 관련 ====================

  // 약 목록 가져오기
  async getMedicineList(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MEDICINE_LIST);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('약 목록 가져오기 실패:', error);
      return [];
    }
  },

  // 약 목록 저장
  async setMedicineList(list: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MEDICINE_LIST, JSON.stringify(list));
    } catch (error) {
      console.error('약 목록 저장 실패:', error);
      throw error;
    }
  },

  // 약 복용 기록 가져오기
  async getMedicineLogs(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MEDICINE_LOGS);
      const logs = data ? JSON.parse(data) : [];
      // Date 문자열을 객체로 복원
      return logs.map((log: any) => ({
        ...log,
        time: new Date(log.time)
      }));
    } catch (error) {
      console.error('약 복용 기록 가져오기 실패:', error);
      return [];
    }
  },

  // 약 복용 기록 추가
  async addMedicineLog(log: any): Promise<void> {
    try {
      const logs = await this.getMedicineLogs();
      logs.push(log);
      await AsyncStorage.setItem(STORAGE_KEYS.MEDICINE_LOGS, JSON.stringify(logs));
    } catch (error) {
      console.error('약 복용 기록 저장 실패:', error);
      throw error;
    }
  },

  // 약 복용 기록 초기화 (디버깅용)
  async clearMedicineLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.MEDICINE_LOGS);
    } catch (error) {
      console.error('약 복용 기록 초기화 실패:', error);
      throw error;
    }
  },

  // 자동 로그인 설정 저장
  async setAutoLogin(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOGIN, JSON.stringify(enabled));
    } catch (error) {
      console.error('자동 로그인 설정 저장 실패:', error);
      throw error;
    }
  },

  // 자동 로그인 설정 가져오기
  async getAutoLogin(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_LOGIN);
      return value ? JSON.parse(value) : true; // 기본값 true
    } catch (error) {
      console.error('자동 로그인 설정 가져오기 실패:', error);
      return true; // 기본값
    }
  }
};
