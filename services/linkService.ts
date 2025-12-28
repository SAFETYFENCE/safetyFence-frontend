import apiClient from '../utils/api/axiosConfig';
import type {
  LinkItem,
  AddLinkRequest,
  DeleteLinkRequest,
  SupporterItem,
  PrimarySupporterResponse,
  SetPrimarySupporterRequest
} from '../types/api';

/**
 * 링크(연결) 관리 API 서비스
 * - 링크 목록 조회
 * - 링크 추가
 * - 링크 삭제
 * - 대표 보호자 관리
 */

export const linkService = {
  /**
   * 링크 목록 조회
   * GET /link/list
   */
  async getList(): Promise<LinkItem[]> {
    const response = await apiClient.get<LinkItem[]>('/link/list');
    return response.data;
  },

  /**
   * 링크 추가
   * POST /link/addUser
   */
  async addUser(data: AddLinkRequest): Promise<string> {
    const response = await apiClient.post<string>('/link/addUser', data);
    return response.data;
  },

  /**
   * 링크 삭제
   * DELETE /link/deleteUser
   */
  async deleteUser(data: DeleteLinkRequest): Promise<string> {
    const response = await apiClient.delete<string>('/link/deleteUser', { data });
    return response.data;
  },

  /**
   * 나의 보호자 목록 조회 (이용자용)
   * GET /api/links/my-supporters
   */
  async getMySupporters(): Promise<SupporterItem[]> {
    const response = await apiClient.get<SupporterItem[]>('/api/links/my-supporters');
    return response.data;
  },

  /**
   * 대표 보호자 설정
   * PATCH /api/links/{linkId}/primary
   */
  async setPrimarySupporter(linkId: number): Promise<string> {
    const response = await apiClient.patch<string>(`/api/links/${linkId}/primary`);
    return response.data;
  },

  /**
   * 대표 보호자 조회
   * GET /api/links/primary-supporter
   */
  async getPrimarySupporter(): Promise<PrimarySupporterResponse> {
    const response = await apiClient.get<PrimarySupporterResponse>('/api/links/primary-supporter');
    return response.data;
  },
};
