/**
 * Geofence 유틸리티 함수들 (순수 함수, React 의존성 없음)
 * 포그라운드(LocationContext)와 백그라운드(backgroundLocationService) 모두에서 사용
 */

import type { GeofenceItem } from '../types/api';

export interface GeofenceCheckResult {
  entries: Array<{ geofenceId: number; name: string }>;
  exits: Array<{ geofenceId: number; name: string }>;
}

/**
 * Haversine 공식으로 두 지점 간 거리 계산 (미터 단위)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * ISO 8601 형식의 문자열을 Date 객체로 파싱
 */
export function parseDateTime(value: string | null): Date | null {
  if (!value) return null;
  const normalized = value.replace(' ', 'T').replace(/\.\d+$/, '');
  const parsed = new Date(normalized);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * 현재 시간이 startTime과 endTime 사이에 있는지 확인
 */
export function isWithinTimeRange(
  startTime: string | null,
  endTime: string | null,
  now: Date
): boolean {
  if (!startTime || !endTime) return true; // 시간 미설정 시 항상 활성

  const start = parseDateTime(startTime);
  const end = parseDateTime(endTime);

  if (!start || !end) {
    // 파싱 실패 시 시간 조건을 무시하고 활성 처리
    return true;
  }

  return now >= start && now <= end;
}

/**
 * 지오펜스 진입/이탈 체크
 * @param lat 현재 위도
 * @param lng 현재 경도
 * @param geofences 지오펜스 목록
 * @param entryState 현재 진입 상태 { [geofenceId]: boolean }
 * @returns 진입/이탈한 지오펜스 목록
 */
export function checkGeofenceEntry(
  lat: number,
  lng: number,
  geofences: GeofenceItem[],
  entryState: { [key: number]: boolean }
): GeofenceCheckResult {
  const entries: Array<{ geofenceId: number; name: string }> = [];
  const exits: Array<{ geofenceId: number; name: string }> = [];

  // 방어: geofences가 없거나 비어있으면 빈 결과 반환
  if (!geofences || geofences.length === 0) {
    return { entries, exits };
  }

  const now = new Date();
  const radius = 100; // 기본 반경 100미터

  for (const fence of geofences) {
    // 1. 거리 체크
    const distance = calculateDistance(lat, lng, fence.latitude, fence.longitude);
    const isInside = distance <= radius;

    // 2. 시간 체크 (일시적 지오펜스만)
    const isTimeActive = fence.type === 0 || isWithinTimeRange(fence.startTime, fence.endTime, now);

    // 3. 진입 조건: 거리 내 + 시간 조건 만족
    const canEnter = isInside && isTimeActive;

    // 진입 감지: 이전에 밖에 있었는데 지금 안에 들어옴
    if (canEnter && !entryState[fence.id]) {
      entries.push({ geofenceId: fence.id, name: fence.name });
    }
    // 이탈 감지: 영구 지오펜스만 이탈 추적 (일시적 지오펜스는 진입 후 사라짐)
    else if (fence.type === 0 && !canEnter && entryState[fence.id]) {
      exits.push({ geofenceId: fence.id, name: fence.name });
    }
  }

  return { entries, exits };
}
