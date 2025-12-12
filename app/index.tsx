import Global from '@/constants/Global';
import { useLocation } from '@/contexts/LocationContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { authService } from '../services/authService';
import { initializeNotifications } from '../services/notificationService';
import { storage } from '../utils/storage';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const { startTracking, connectWebSocket, disconnectWebSocket } = useLocation();
  const [number, setNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    // 입력 검증
    if (!number.trim() || !password.trim()) {
      Alert.alert('입력 오류', '전화번호와 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      // API 호출: POST /user/signIn
      const response = await authService.signIn({
        number: number.trim(),
        password: password.trim(),
      });

      console.log('로그인 성공:', response);

      // Global 상태 업데이트
      Global.NUMBER = response.number;

      // AsyncStorage에 로그인 정보 저장
      await storage.setLoginInfo(response.apiKey, response.number, response.name);

      // 로그인 성공 후 알림 토큰 발급 및 서버 등록
      await initializeNotifications();

      // 기존 연결이 있다면 정리하고 역할 선택 화면으로 이동
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

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="#22c55e" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 헤더 섹션 - Signup.tsx와 통일감 있는 디자인 */}
            <View className="bg-green-500 px-6 pt-16 pb-12 rounded-b-[40px] shadow-sm mb-8 items-center">
              <View className="mb-6 p-2 bg-white/20 rounded-full">
                <Image
                  source={require('../assets/images/logo.png')}
                  className="w-24 h-24 rounded-full"
                  resizeMode="cover"
                />
              </View>
              <Text className="text-3xl font-bold text-white mb-2 tracking-tight text-center">
                Safety Fence
              </Text>
              <Text className="text-green-100 text-base font-medium text-center">
                안전하고 편리한 케어 서비스
              </Text>
            </View>

            <View className="px-6">
              {/* 로그인 폼 */}
              <View className="mb-6">
                <Text className="text-gray-600 font-semibold mb-2 ml-1">전화번호</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-900 text-base mb-5"
                  placeholder="01012345678"
                  placeholderTextColor="#9ca3af"
                  value={number}
                  onChangeText={setNumber}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text className="text-gray-600 font-semibold mb-2 ml-1">비밀번호</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-900 text-base mb-8"
                  placeholder="비밀번호를 입력하세요"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                <TouchableOpacity
                  className={`w-full py-4 rounded-2xl items-center justify-center shadow-lg shadow-green-200 ${isLoading ? 'bg-green-400' : 'bg-green-500 active:bg-green-600'
                    }`}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator size="small" color="white" />
                      <Text className="text-white font-bold text-lg ml-2">
                        로그인 중...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-white font-bold text-lg">
                      로그인
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* 회원가입 및 추가 링크 */}
              <View className="flex-row justify-center items-center mb-8">
                <Text className="text-gray-500 text-base">
                  계정이 없으신가요?
                </Text>
                <TouchableOpacity onPress={handleSignup} className="ml-2 py-2">
                  <Text className="text-green-500 font-bold text-base">
                    회원가입
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 하단 정보 */}
              <View className="items-center mt-auto">
                <Text className="text-xs text-gray-400 text-center leading-5">
                  로그인함으로써{'\n'}서비스 이용약관에 동의합니다
                </Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginPage;
