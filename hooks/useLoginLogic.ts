
import Global from '@/constants/Global';
import { useLocation } from '@/contexts/LocationContext';
import { authService } from '@/services/authService';
import { initializeNotifications } from '@/services/notificationService';
import { storage } from '@/utils/storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

export const useLoginLogic = () => {
    const router = useRouter();
    const { disconnectWebSocket, connectWebSocket } = useLocation();
    const [number, setNumber] = useState('');
    const [password, setPassword] = useState('111');
    const [isLoading, setIsLoading] = useState(false);
    const [autoLogin, setAutoLogin] = useState(true);
    const [isCheckingAutoLogin, setIsCheckingAutoLogin] = useState(true);

    // 앱 시작 시 자동 로그인 확인
    useEffect(() => {
        const checkAutoLogin = async () => {
            try {
                    const [savedAutoLogin, apiKey, userRole] = await Promise.all([
                        storage.getAutoLogin(),
                        storage.getApiKey(),
                        storage.getUserRole(),
                    ]);

                setAutoLogin(savedAutoLogin);

                // 자동 로그인이 활성화되어 있고 로그인 정보가 있으면 자동 로그인
                if (savedAutoLogin && apiKey) {
                    console.log('✅ 자동 로그인 시작');

                    // FCM 토큰 갱신
                    await initializeNotifications();

                    Global.API_KEY = apiKey;
                    if (userRole === 'user') {
                        // 자동 로그인 시에는 startTracking()을 호출하지 않음
                        // UserMainPage에서 useEffect로 자동 시작됨
                        await disconnectWebSocket();
                        connectWebSocket();
                        router.replace('/UserMainPage');
                    } else if (userRole === 'supporter') {
                        await disconnectWebSocket();
                        router.replace('/LinkPage');
                    } else {
                        // 역할이 없으면 역할 선택 화면으로
                        router.replace('/SelectRole');
                    }
                } else {
                    setIsCheckingAutoLogin(false);
                }
            } catch (error) {
                console.error('자동 로그인 확인 실패:', error);
                setIsCheckingAutoLogin(false);
            }
        };

        checkAutoLogin();
    }, []);

    const handleLogin = async () => {
        if (!number.trim() || !password.trim()) {
            Alert.alert('입력 오류', '전화번호와 비밀번호를 입력해주세요.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await authService.signIn({
                number: number.trim(),
                password: password.trim(),
            });

            console.log('로그인 성공:', response);

            Global.NUMBER = response.number;
            Global.API_KEY = response.apiKey;

            await storage.setLoginInfo(response.apiKey, response.number, response.name);
            await storage.setAutoLogin(autoLogin); // 자동 로그인 설정 저장
            await initializeNotifications();
            await disconnectWebSocket();

            router.replace('/SelectRole');
        } catch (error: any) {
            const message = error.response?.data?.message || '로그인에 실패했습니다. 다시 시도해주세요.';
            Alert.alert('로그인 실패', message);
            console.error('로그인 실패:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = () => {
        router.push('/Signup');
    };

    return {
        number,
        password,
        isLoading,
        autoLogin,
        isCheckingAutoLogin,
        setNumber,
        setPassword,
        setAutoLogin,
        handleLogin,
        handleSignup
    };
};
