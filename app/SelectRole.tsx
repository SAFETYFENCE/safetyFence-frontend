import Global from '@/constants/Global';
import { useLocation } from '@/contexts/LocationContext';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Shield, User } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { storage } from '../utils/storage';

type UserRole = 'user' | 'supporter' | null;

export default function SelectRolePage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const { startTracking, stopTracking, connectWebSocket, disconnectWebSocket } = useLocation();

  const handleRoleSelect = (role: 'user' | 'supporter') => {
    setSelectedRole(role);
  };

  const handleContinue = async () => {
    if (selectedRole) {
      try {
        console.log('선택한 역할:', selectedRole);

        Global.USER_ROLE = selectedRole;
        await storage.setUserRole(selectedRole);

        if (Global.USER_ROLE === 'user') {
          await startTracking();
          await disconnectWebSocket();
          connectWebSocket();
          router.replace('/UserMainPage');
        } else if (Global.USER_ROLE === 'supporter') {
          await stopTracking();
          await disconnectWebSocket();

          // 보호자도 지오펜스 설정 등을 위해 위치 권한 필요
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(
                '위치 권한 필요',
                '지오펜스 설정 등의 기능을 사용하려면 위치 권한이 필요합니다.',
                [{ text: '확인' }]
              );
            }
          } catch (permError) {
            console.warn('⚠️ 보호자 위치 권한 요청 실패:', permError);
          }

          router.replace('/LinkPage');
        }

      } catch (error) {
        console.error('역할 선택 중 오류:', error);
        Alert.alert('오류', '역할 선택 중 문제가 발생했습니다.');
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        {/* 헤더 */}
        <View className="bg-green-500 px-6 pt-16 pb-12 rounded-b-[40px] shadow-sm mb-8 items-center">
          <Text className="text-3xl font-bold text-white mb-2 tracking-tight text-center">
            환영합니다!
          </Text>
          <Text className="text-green-100 text-base font-medium text-center">
            서비스 이용을 위해 역할을 선택해주세요
          </Text>
        </View>

        {/* 역할 선택 카드들 - 화면 중앙 정렬 */}
        <View className="px-6 py-5 flex-1 justify-center">
          <View>
            {/* 이용자 카드 */}
            <TouchableOpacity
              onPress={() => handleRoleSelect('user')}
              className={`w-full flex-row items-center py-6 px-6 rounded-2xl border-2 ${selectedRole === 'user'
                ? 'border-green-500 bg-green-50 shadow-md'
                : 'border-gray-100 bg-white shadow-sm'
                }`}
              activeOpacity={0.7}
            >
              <View
                className={`h-16 w-16 rounded-full items-center justify-center mr-5 ${selectedRole === 'user' ? 'bg-green-100' : 'bg-gray-100'
                  }`}
              >
                <User
                  size={36}
                  color={selectedRole === 'user' ? '#16a34a' : '#9ca3af'}
                />
              </View>
              <View className="flex-1">
                <Text className={`text-2xl font-bold mb-1 text-left ${selectedRole === 'user' ? 'text-green-800' : 'text-gray-900'}`}>
                  이용자
                </Text>
                <Text className="text-lg text-gray-500 text-left font-medium">
                  서비스를 직접 이용하는 분
                </Text>
              </View>
              <View className={`w-8 h-8 rounded-full border-2 items-center justify-center ml-2 ${selectedRole === 'user' ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                {selectedRole === 'user' && <View className="w-3.5 h-3.5 rounded-full bg-white" />}
              </View>
            </TouchableOpacity>

            {/* 강제 간격 추가 */}
            <View className="h-8" />

            {/* 보호자 카드 */}
            <TouchableOpacity
              onPress={() => handleRoleSelect('supporter')}
              className={`w-full flex-row items-center py-6 px-6 rounded-2xl border-2 ${selectedRole === 'supporter'
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-100 bg-white shadow-sm'
                }`}
              activeOpacity={0.7}
            >
              <View
                className={`h-16 w-16 rounded-full items-center justify-center mr-5 ${selectedRole === 'supporter' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}
              >
                <Shield
                  size={36}
                  color={selectedRole === 'supporter' ? '#3b82f6' : '#9ca3af'}
                />
              </View>
              <View className="flex-1">
                <Text className={`text-2xl font-bold mb-1 text-left ${selectedRole === 'supporter' ? 'text-blue-800' : 'text-gray-900'}`}>
                  보호자
                </Text>
                <Text className="text-lg text-gray-500 text-left font-medium">
                  이용자를 돌보는 관리자
                </Text>
              </View>
              <View className={`w-8 h-8 rounded-full border-2 items-center justify-center ml-2 ${selectedRole === 'supporter' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                {selectedRole === 'supporter' && <View className="w-3.5 h-3.5 rounded-full bg-white" />}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 계속하기 버튼 - 위로 2cm 올림 */}
        <View className="px-6 pb-20">
          <TouchableOpacity
            onPress={handleContinue}
            disabled={!selectedRole}
            className={`w-full py-4 rounded-2xl items-center justify-center shadow-lg ${selectedRole
              ? selectedRole === 'user'
                ? 'bg-green-600 shadow-green-200 active:bg-green-700'
                : 'bg-blue-600 shadow-blue-200 active:bg-blue-700'
              : 'bg-gray-200'
              }`}
            activeOpacity={selectedRole ? 0.8 : 1}
          >
            <Text
              className={`text-lg font-bold ${selectedRole ? 'text-white' : 'text-gray-400'
                }`}
            >
              {selectedRole === 'user' ? '이용자로 시작하기' : selectedRole === 'supporter' ? '보호자로 시작하기' : '역할을 선택해주세요'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
