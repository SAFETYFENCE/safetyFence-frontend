
import Global from '@/constants/Global';
import { useLocation } from '@/contexts/LocationContext';
import { authService } from '@/services/authService';
import { initializeNotifications } from '@/services/notificationService';
import { storage } from '@/utils/storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

export const useLoginLogic = () => {
    const router = useRouter();
    const { disconnectWebSocket } = useLocation();
    const [number, setNumber] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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

            await storage.setLoginInfo(response.apiKey, response.number, response.name);
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
        setNumber,
        setPassword,
        handleLogin,
        handleSignup
    };
};
