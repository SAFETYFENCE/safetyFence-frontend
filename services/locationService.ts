import apiClient from '../utils/api/axiosConfig';
import Global from '../constants/Global';

/**
 * 일일 이동거리 응답 타입
 */
export interface DailyDistanceResponse {
  userNumber: string;
  date: string;            // YYYY-MM-DD
  distanceMeters: number;  // 미터 단위
  distanceKm: number;      // 킬로미터 단위 (소수점 2자리)
  locationCount: number;   // 해당 날짜의 위치 기록 수
}

/**
 * 위치 업데이트 요청 타입
 */
export interface LocationUpdateRequest {
  latitude: number;
  longitude: number;
  timestamp?: number;
  batteryLevel?: number;
}

/**
 * 위치 업데이트 결과 타입
 */
export type LocationUpdateResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * 위치 관련 API 서비스
 * - HTTP 위치 전송 (백그라운드용)
 * - 일일 이동거리 조회
 */
export const locationService = {
  /**
   * HTTP로 위치 전송 (백그라운드 전용)
   * POST /location
   * - Doze 모드에서도 안정적으로 작동
   * - WebSocket이 끊겨도 HTTP 요청은 maintenance window에 전송 가능
   */
  async sendLocationHttp(location: LocationUpdateRequest): Promise<LocationUpdateResult> {
    try {
      if (!Global.NUMBER) {
        return { ok: false, reason: 'no-user-number' };
      }

      await apiClient.post('/location', {
        latitude: location.latitude,
        longitude: location.longitude,
        batteryLevel: location.batteryLevel,
      }, {
        headers: {
          'userNumber': Global.NUMBER,
        },
        timeout: 30000, // 백그라운드에서는 30초 타임아웃
      });

      console.log('✅ [HTTP] 위치 전송 성공');
      return { ok: true };
    } catch (error: any) {
      const reason = error?.response?.status
        ? `http-${error.response.status}`
        : error?.code || 'unknown-error';
      console.warn(`⚠️ [HTTP] 위치 전송 실패: ${reason}`, error?.message);
      return { ok: false, reason };
    }
  },

  /**
   * 오늘 일일 이동거리 조회
   * POST /location/daily-distance
   * @param targetNumber - 조회할 이용자 번호 (선택사항, 없으면 본인)
   */
  async getDailyDistance(targetNumber?: string): Promise<DailyDistanceResponse> {
    const number = targetNumber || undefined;
    const response = await apiClient.post<DailyDistanceResponse>(
      '/location/daily-distance',
      number ? { number } : {}
    );
    return response.data;
  },

  /**
   * 특정 날짜 이동거리 조회
   * POST /location/daily-distance/{date}
   * @param date - 조회할 날짜 (YYYY-MM-DD)
   * @param targetNumber - 조회할 이용자 번호 (선택사항, 없으면 본인)
   */
  async getDailyDistanceByDate(date: string, targetNumber?: string): Promise<DailyDistanceResponse> {
    const number = targetNumber || undefined;
    const response = await apiClient.post<DailyDistanceResponse>(
      `/location/daily-distance/${date}`,
      number ? { number } : {}
    );
    return response.data;
  },
};
