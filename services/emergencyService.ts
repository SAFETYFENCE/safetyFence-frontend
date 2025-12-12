import Global from '@/constants/Global';
import apiClient from '../utils/api/axiosConfig';
import { storage } from '../utils/storage';

/**
 * 긴급 알림 전송 서비스
 * - 눌렀다는 사실과 사용자 번호만 서버로 전송
 */
export const emergencyService = {
  async sendAlert(): Promise<void> {
    // 일부 화면에서는 Global.NUMBER가 비어 있을 수 있어 스토리지에서 보강
    const userNumber = Global.NUMBER || (await storage.getUserNumber());
    const body = { userNumber };

    await apiClient.post('/notification/emergency', body);
  },
};
