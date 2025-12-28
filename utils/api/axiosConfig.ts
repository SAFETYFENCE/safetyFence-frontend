import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Alert } from 'react-native';
import Global from '../../constants/Global';
import { storage } from '../storage';

/**
 * Axios 인스턴스 설정
 * - baseURL: Global.URL (현재 맥북 IP)
 * - timeout: 10초
 * - 인터셉터: apiKey 자동 주입, 에러 처리
 */

// Axios 인스턴스 생성
const apiClient: AxiosInstance = axios.create({
  baseURL: Global.URL,
  timeout: 90000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: apiKey 자동 주입
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // 회원가입과 로그인은 apiKey가 필요 없음
      const excludedPaths = ['/user/signup', '/user/signIn'];
      const isExcluded = excludedPaths.some(path => config.url?.includes(path));

      if (!isExcluded) {
        // AsyncStorage에서 apiKey 가져오기
        const apiKey = await storage.getApiKey();

        console.log('🔑 API 요청 인터셉터:', {
          url: config.url,
          hasApiKey: !!apiKey,
          apiKeyPreview: apiKey ? apiKey.substring(0, 10) + '...' : 'null'
        });

        // apiKey가 있으면 헤더에 추가 (백엔드는 X-API-Key 헤더를 기대함)
        if (apiKey && config.headers) {
          config.headers['X-API-Key'] = apiKey;
        } else if (!apiKey) {
          console.warn('⚠️ apiKey가 없습니다! 요청이 실패할 수 있습니다.');
        }
      }

      return config;
    } catch (error) {
      console.error('요청 인터셉터 에러:', error);
      return config;
    }
  },
  (error) => {
    console.error('요청 준비 중 에러:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 에러 처리
apiClient.interceptors.response.use(
  (response) => {
    // 성공 응답은 그대로 반환
    return response;
  },
  async (error: AxiosError) => {
    // 에러 처리
    if (error.response) {
      const status = error.response.status;
      const message = (error.response.data as any)?.message || '오류가 발생했습니다.';

      switch (status) {
        case 400:
          console.error('잘못된 요청:', message);
          Alert.alert('요청 오류', message);
          break;

        case 401:
          console.error('인증 실패:', message);
          Alert.alert('인증 실패', '다시 로그인해주세요.');
          // 저장된 정보 삭제
          await storage.clearAll();
          // TODO: 로그인 페이지로 이동 (네비게이션 추가 필요)
          break;

        case 403:
          console.error('권한 없음:', message);
          Alert.alert('권한 없음', '접근 권한이 없습니다.');
          break;

        case 404:
          // 404는 에러가 아닐 수 있음 (예: 대표 보호자 미설정)
          // 각 컴포넌트/서비스에서 필요한 경우 처리하도록 함
          console.log('ℹ️ 리소스 없음 (404):', message);
          // Alert 제거: 컴포넌트에서 필요시 처리
          break;

        case 409:
          console.error('충돌:', message);
          Alert.alert('중복 오류', message);
          break;

        case 500:
          console.error('서버 오류:', message);
          Alert.alert('서버 오류', '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
          break;

        default:
          console.error('알 수 없는 오류:', status, message);
          Alert.alert('오류', message);
      }
    } else if (error.request) {
      // 요청은 보냈지만 응답을 받지 못함 (네트워크 오류)
      console.error('=== 네트워크 오류 상세 ===');
      console.error('URL:', (error.config?.baseURL || '') + (error.config?.url || ''));
      console.error('Method:', error.config?.method);
      console.error('Error Message:', error.message);
      console.error('Error Code:', error.code);
      console.error('========================');
      Alert.alert(
        '네트워크 오류',
        `서버 연결 실패\nURL: ${error.config?.url || '알 수 없음'}\n에러: ${error.message}`
      );
    } else {
      // 요청 설정 중 오류 발생
      console.error('요청 설정 오류:', error.message);
      Alert.alert('오류', '요청 처리 중 오류가 발생했습니다.');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
