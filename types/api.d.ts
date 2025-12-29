/**
 * Safety Fence API 타입 정의
 * API 명세서 기반 타입 정의 (docs/API_명세서.md)
 */

// ==================== 인증 및 사용자 관리 ====================

export interface SignupRequest {
  number: string;
  name: string;
  password: string;
  birth: string; // yyyy-MM-dd
  homeAddress: string; // 우편번호
  centerAddress?: string; // 우편번호 (선택)
  homeStreetAddress: string;
  homeStreetAddressDetail: string;
  centerStreetAddress?: string;
}

export interface SignupResponse {
  name: string;
  number: string;
}

export interface SignInRequest {
  number: string;
  password: string;
}

export interface SignInResponse {
  message: string;
  apiKey: string;
  name: string;
  number: string;
}

// ==================== 링크(연결) 관리 ====================

export interface LinkItem {
  id: number;
  userNumber: string;
  relation: string;
  batteryLevel: number | null;
  batteryLastUpdate: number | null; // Unix timestamp (milliseconds)
}

export interface AddLinkRequest {
  linkCode: string;
  relation: string;
}

export interface DeleteLinkRequest {
  number: string;
}

// ==================== 대표 보호자 ====================

export interface SupporterItem {
  linkId: number;
  supporterNumber: string;
  supporterName: string;
  relation: string;
  isPrimary: boolean;
}

export interface PrimarySupporterResponse {
  linkId: number;
  supporterNumber: string;
  supporterName: string;
  relation: string;
  isPrimary: boolean;
}

export interface SetPrimarySupporterRequest {
  linkId: number;
}

// ==================== 지오펜스 ====================

export interface GeofenceItem {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 0 | 1; // 0: 영구, 1: 일시
  startTime: string | null; // ISO string or null
  endTime: string | null; // ISO string or null
  maxSequence: number;
}

export interface CreateGeofenceRequest {
  name: string;
  address: string;
  type: 0 | 1;
  startTime?: string | null; // "HH:mm" 형식
  endTime?: string | null; // "HH:mm" 형식
  latitude?: number;
  longitude?: number;
}

export interface GeofenceEnterRequest {
  geofenceId: number;
}

export interface DeleteGeofenceRequest {
  id: number;
}

// ==================== 로그 ====================

export interface LogItem {
  id: number;
  location: string;
  locationAddress: string;
  arriveTime: string; // "yyyy-MM-dd HH:mm:ss"
}

// ==================== 캘린더 ====================

export interface CalendarLogItem {
  logId: number;
  location: string;
  locationAddress: string;
  arriveTime: string; // "HH:mm:ss"
}

export interface CalendarGeofenceItem {
  geofenceId: number;
  name: string;
  address: string;
  type: 0 | 1; // 0: 영구, 1: 일시
  startTime: string; // ISO string
  endTime: string; // ISO string
}

export interface CalendarEventItem {
  userEventId: number;
  event: string;
  eventStartTime: string; // "HH:mm:ss"
}

export interface CalendarDayData {
  date: string; // "yyyy-MM-dd"
  logs: CalendarLogItem[];
  geofences: CalendarGeofenceItem[];
  userEvents: CalendarEventItem[];
}

export interface AddEventRequest {
  event: string;
  eventDate: string; // "yyyy-MM-dd"
  startTime: string; // "HH:mm"
}

// ==================== 마이페이지 ====================

export interface MyPageGeofence {
  id: number;
  name: string;
  address: string;
  type: 0 | 1;
  startTime: string | null;
  endTime: string | null;
}

export interface MyPageData {
  name: string;
  birth: string;
  homeAddress: string;
  centerAddress: string;
  linkCode: string;
  geofences: MyPageGeofence[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangeHomeAddressRequest {
  homeAddress: string;
  homeStreetAddress: string;
  homeStreetAddressDetail: string;
}

export interface ChangeCenterAddressRequest {
  centerAddress: string;
  centerStreetAddress: string;
}

// ==================== 약 관리 ====================

export interface MedicationItem {
  id: number;
  name: string;
  dosage: string;
  purpose: string;
  frequency: string;
  checkedToday?: boolean;
  checkCount?: number; // 오늘 복용 횟수
}

export interface MedicationListResponse {
  checkDate: string;
  medications: MedicationItem[];
}

export interface CreateMedicationRequest {
  name: string;
  dosage: string;
  purpose: string;
  frequency: string;
}

export interface MedicationCheckResponse {
  message: string;
  medicationId: number;
  checkedDateTime: string;
}

export interface MedicationUncheckResponse {
  message: string;
  medicationId: number;
}

export interface MedicationHistoryItem {
  logId: number;
  checkedDateTime: string;
}

export interface MedicationHistoryResponse {
  medicationId: number;
  medicationName: string;
  history: MedicationHistoryItem[];
}

export interface WardMedicationData {
  wardNumber: string;
  wardName: string;
  medications: MedicationItem[];
  totalMedications: number;
  checkedMedications: number;
}

// ==================== 에러 응답 ====================

export interface ErrorResponse {
  status: string;
  message: string;
  code?: string;
}

// ==================== 피보호자 알림 ====================

export interface MedicationAddedNotificationRequest {
  targetUserNumber: string;
  medicationName: string;
}

export interface EventAddedNotificationRequest {
  targetUserNumber: string;
  eventTitle: string;
  eventDate: string; // "yyyy-MM-dd"
  eventTime: string; // "HH:mm"
}

// ==================== WebSocket (참고용, Phase 1에서는 미사용) ====================

export interface LocationMessage {
  latitude: number;
  longitude: number;
}

export interface LocationReceived {
  userNumber: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}
