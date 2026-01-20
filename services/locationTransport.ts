/**
 * 포그라운드 위치 전송 서비스 (WebSocket)
 *
 * ⚠️ 이 모듈은 포그라운드에서만 사용됩니다!
 * - 포그라운드: WebSocket 사용 (실시간, 저지연)
 * - 백그라운드: locationService.sendLocationHttp() 사용 (HTTP, Doze 모드 안정적)
 *
 * 백그라운드에서 WebSocket은 Doze 모드로 인해 연결이 불안정하므로
 * backgroundLocationService.ts에서는 HTTP를 사용합니다.
 */

import { websocketService } from './websocketService';

type SendResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * WebSocket으로 위치 전송 (포그라운드 전용)
 * - 포그라운드에서 2초 주기로 호출됨
 * - WebSocket이 끊겨 있으면 전송 생략 (재연결 대기)
 */
export async function sendLocationUpdate(opts: {
  latitude: number;
  longitude: number;
  timestamp?: number;
  batteryLevel?: number;
}): Promise<SendResult> {
  try {
    // WebSocket 연결 확인
    if (!websocketService.isConnected()) {
      console.log('ℹ️ [Transport] WebSocket 미연결 - 위치 전송 생략 (재연결 대기)');
      return { ok: false, reason: 'websocket-disconnected' };
    }

    const payload = {
      latitude: opts.latitude,
      longitude: opts.longitude,
      timestamp: opts.timestamp ?? Date.now(),
      ...(opts.batteryLevel !== undefined && { batteryLevel: opts.batteryLevel }),
    };

    try {
      websocketService.sendLocation(payload);
      return { ok: true };
    } catch (err) {
      console.warn('⚠️ [Transport] WebSocket 전송 실패:', err);
      return { ok: false, reason: 'websocket-error' };
    }
  } catch (err) {
    console.error('❌ [Transport] 위치 전송 중 오류:', err);
    return { ok: false, reason: 'unexpected-error' };
  }
}
