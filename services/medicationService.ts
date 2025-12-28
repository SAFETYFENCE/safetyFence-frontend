import apiClient from '../utils/api/axiosConfig';
import type {
  MedicationListResponse,
  MedicationItem,
  CreateMedicationRequest,
  MedicationCheckResponse,
  MedicationUncheckResponse,
  MedicationHistoryResponse,
  WardMedicationData
} from '../types/api';

/**
 * 약 관리 API 서비스
 * - 약 목록 조회 (이용자용)
 * - 약 추가
 * - 약 삭제
 * - 복용 체크/해제
 * - 복용 이력 조회
 * - 보호자용 약 조회
 */

export const medicationService = {
  /**
   * 약 목록 조회
   * GET /api/medications
   * @param date - 조회 날짜 (yyyy-MM-dd), 없으면 오늘
   */
  async getList(date?: string): Promise<MedicationListResponse> {
    const params = date ? { date } : {};
    const response = await apiClient.get<MedicationListResponse>('/api/medications', { params });
    return response.data;
  },

  /**
   * 약 추가
   * POST /api/medications
   * @param data - 약 정보
   * @param targetUserNumber - 약을 등록할 이용자 번호 (선택사항, 없으면 본인)
   */
  async create(data: CreateMedicationRequest, targetUserNumber?: string): Promise<MedicationItem> {
    const payload = targetUserNumber ? { ...data, targetUserNumber } : data;
    const response = await apiClient.post<MedicationItem>('/api/medications', payload);
    return response.data;
  },

  /**
   * 약 삭제
   * DELETE /api/medications/{id}
   */
  async delete(medicationId: number): Promise<{ deletedMedicationId: number }> {
    const response = await apiClient.delete<{ deletedMedicationId: number }>(
      `/api/medications/${medicationId}`
    );
    return response.data;
  },

  /**
   * 복용 체크
   * POST /api/medications/{id}/check
   */
  async check(medicationId: number): Promise<MedicationCheckResponse> {
    const response = await apiClient.post<MedicationCheckResponse>(
      `/api/medications/${medicationId}/check`
    );
    return response.data;
  },

  /**
   * 복용 체크 해제
   * DELETE /api/medications/{id}/check (백엔드 실제 엔드포인트)
   */
  async uncheck(medicationId: number): Promise<MedicationUncheckResponse> {
    const response = await apiClient.delete<MedicationUncheckResponse>(
      `/api/medications/${medicationId}/check`
    );
    return response.data;
  },

  /**
   * 복용 이력 조회
   * GET /api/medications/{id}/history
   */
  async getHistory(medicationId: number): Promise<MedicationHistoryResponse> {
    const response = await apiClient.get<MedicationHistoryResponse>(
      `/api/medications/${medicationId}/history`
    );
    return response.data;
  },

  /**
   * 보호자용 - 피보호자들의 약 복용 상태 조회
   * GET /api/medications/wards-today
   * @param date - 조회 날짜 (yyyy-MM-dd), 없으면 오늘
   */
  async getWardsToday(date?: string): Promise<WardMedicationData[]> {
    const params = date ? { date } : {};
    const response = await apiClient.get<WardMedicationData[]>('/api/medications/wards-today', { params });
    return response.data;
  },
};
